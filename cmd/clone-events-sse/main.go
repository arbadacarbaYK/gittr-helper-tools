package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type repoEvent struct {
	Type      string `json:"type"`
	Repo      string `json:"repo"`
	Timestamp int64  `json:"timestamp"`
}

type eventHub struct {
	sync.RWMutex
	subscribers map[chan repoEvent]struct{}
	buffer      []repoEvent
	maxBuffer   int
}

func newEventHub(maxBuffer int) *eventHub {
	return &eventHub{
		subscribers: make(map[chan repoEvent]struct{}),
		buffer:      make([]repoEvent, 0, maxBuffer),
		maxBuffer:   maxBuffer,
	}
}

func (h *eventHub) publish(evt repoEvent) {
	h.Lock()
	if len(h.buffer) >= h.maxBuffer {
		h.buffer = h.buffer[1:]
	}
	h.buffer = append(h.buffer, evt)
	for ch := range h.subscribers {
		select {
		case ch <- evt:
		default:
		}
	}
	h.Unlock()
}

func (h *eventHub) subscribe() chan repoEvent {
	ch := make(chan repoEvent, 10)
	h.Lock()
	h.subscribers[ch] = struct{}{}
	for _, evt := range h.buffer {
		select {
		case ch <- evt:
		default:
		}
	}
	h.Unlock()
	return ch
}

func (h *eventHub) unsubscribe(ch chan repoEvent) {
	h.Lock()
	delete(h.subscribers, ch)
	close(ch)
	h.Unlock()
}

func main() {
	listenAddr := getEnv("LISTEN_ADDR", ":4010")
	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	allowOrigins := strings.Split(getEnv("ALLOW_ORIGINS", ""), ",")
	maxBuffer := getEnvInt("EVENT_BUFFER", 200)

	hub := newEventHub(maxBuffer)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "ok")
	})

	mux.HandleFunc("/webhooks/repo-cloned", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if webhookSecret != "" && !validSignature(r.Header.Get("X-Signature"), webhookSecret, body) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
		var payload struct {
			Repo string `json:"repo"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if payload.Repo == "" {
			http.Error(w, "missing repo", http.StatusBadRequest)
			return
		}
		evt := repoEvent{Type: "repo_cloned", Repo: payload.Repo, Timestamp: time.Now().Unix()}
		hub.publish(evt)
		log.Printf("📣 repo cloned: %s", payload.Repo)
		w.WriteHeader(http.StatusAccepted)
	})

	mux.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		setCORS(w, r, allowOrigins)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		ch := hub.subscribe()
		defer hub.unsubscribe(ch)

		ctx := r.Context()
		for {
			select {
			case <-ctx.Done():
				return
			case evt := <-ch:
				payload, _ := json.Marshal(evt)
				fmt.Fprintf(w, "event: %s\n", evt.Type)
				fmt.Fprintf(w, "data: %s\n\n", payload)
				flusher.Flush()
			}
		}
	})

	server := &http.Server{Addr: listenAddr, Handler: mux}

	go func() {
		log.Printf("🚀 clone-events-sse listening on %s", listenAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	waitForShutdown(server)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if n, err := strconv.Atoi(value); err == nil {
			return n
		}
	}
	return fallback
}

func validSignature(sigHeader, secret string, body []byte) bool {
	if sigHeader == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(sigHeader), []byte(expected))
}

func setCORS(w http.ResponseWriter, r *http.Request, allowOrigins []string) {
	origin := r.Header.Get("Origin")
	for _, allowed := range allowOrigins {
		allowed = strings.TrimSpace(allowed)
		if allowed == "" {
			continue
		}
		if origin == allowed {
			w.Header().Set("Access-Control-Allow-Origin", allowed)
			w.Header().Set("Vary", "Origin")
			break
		}
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type,X-Signature")
}

func waitForShutdown(server *http.Server) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()
	log.Println("🛑 shutting down clone-events-sse...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
