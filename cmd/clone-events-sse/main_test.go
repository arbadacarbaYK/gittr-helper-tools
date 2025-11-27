package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestValidSignature(t *testing.T) {
	secret := "test-secret"
	payload := []byte("{\"repo\":\"npub/repo\"}")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	sig := hex.EncodeToString(mac.Sum(nil))

	if !validSignature(sig, secret, payload) {
		t.Fatalf("expected signature to be valid")
	}

	if validSignature("deadbeef", secret, payload) {
		t.Fatalf("expected signature to be invalid")
	}
}

func TestEventHubBuffer(t *testing.T) {
	hub := newEventHub(2)
	hub.publish(repoEvent{Repo: "a"})
	hub.publish(repoEvent{Repo: "b"})
	hub.publish(repoEvent{Repo: "c"})

	if len(hub.buffer) != 2 {
		t.Fatalf("expected buffer size 2, got %d", len(hub.buffer))
	}
	if hub.buffer[0].Repo != "b" || hub.buffer[1].Repo != "c" {
		t.Fatalf("unexpected buffer contents: %+v", hub.buffer)
	}
}
