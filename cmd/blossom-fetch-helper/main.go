package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	sourceURL = flag.String("source", "", "HTTPS, git, or nip96 Blossom URL")
	repoPath  = flag.String("repo-path", "", "Bare repository destination (e.g. /opt/ngit/git-nostr-repositories/<pk>/<repo>.git)")
	cacheDir  = flag.String("cache-dir", "", "Optional cache directory for downloaded packs")
)

func main() {
	flag.Parse()
	if *sourceURL == "" || *repoPath == "" {
		log.Fatal("--source and --repo-path are required")
	}

	normalized, err := normalizeGitURL(*sourceURL)
	if err != nil {
		log.Fatalf("invalid source url: %v", err)
	}

	start := time.Now()
	bytesWritten, err := fetchToRepo(normalized, *repoPath, *cacheDir)
	if err != nil {
		log.Fatalf("fetch failed: %v", err)
	}
	log.Printf("✅ fetched %d bytes for %s in %s", bytesWritten, *repoPath, time.Since(start))
}

func normalizeGitURL(raw string) (string, error) {
	if strings.HasPrefix(raw, "git@") {
		parts := strings.SplitN(strings.TrimPrefix(raw, "git@"), ":", 2)
		if len(parts) != 2 {
			return "", fmt.Errorf("invalid git@ url: %s", raw)
		}
		host := parts[0]
		path := strings.TrimSuffix(parts[1], ".git")
		return fmt.Sprintf("https://%s/%s", host, path), nil
	}
	if strings.HasPrefix(raw, "git://") {
		return "https://" + strings.TrimPrefix(raw, "git://"), nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if u.Scheme == "nip96" {
		u.Scheme = "https"
	}
	if u.Scheme != "https" && u.Scheme != "http" {
		return "", fmt.Errorf("unsupported scheme: %s", u.Scheme)
	}
	return u.String(), nil
}

func fetchToRepo(src, repo, cache string) (int64, error) {
	if err := os.MkdirAll(repo, 0o755); err != nil {
		return 0, fmt.Errorf("mkdir repo: %w", err)
	}

	tmpFile, err := os.CreateTemp(cacheOrDefault(cache), "blossom-pack-*.pack")
	if err != nil {
		return 0, fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	req, err := http.NewRequest(http.MethodGet, src, nil)
	if err != nil {
		return 0, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("User-Agent", "gittr-blossom-helper/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return 0, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	bytes, err := io.Copy(tmpFile, resp.Body)
	if err != nil {
		return 0, fmt.Errorf("copy body: %w", err)
	}

	if err := tmpFile.Sync(); err != nil {
		return 0, fmt.Errorf("sync temp file: %w", err)
	}

	dest := filepath.Join(repo, "packs", filepath.Base(tmpFile.Name()))
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return 0, fmt.Errorf("mkdir packs: %w", err)
	}
	if err := os.Rename(tmpFile.Name(), dest); err != nil {
		return 0, fmt.Errorf("move pack: %w", err)
	}
	return bytes, nil
}

func cacheOrDefault(cache string) string {
	if cache == "" {
		return os.TempDir()
	}
	if err := os.MkdirAll(cache, 0o755); err != nil {
		log.Fatalf("create cache dir: %v", err)
	}
	return cache
}
