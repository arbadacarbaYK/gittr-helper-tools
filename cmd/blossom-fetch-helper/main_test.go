package main

import "testing"

func TestNormalizeGitURL(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"git@github.com:user/repo.git", "https://github.com/user/repo"},
		{"git://example.com/foo.git", "https://example.com/foo.git"},
		{"nip96://blossom.server/packs/abc", "https://blossom.server/packs/abc"},
		{"https://codeberg.org/user/repo", "https://codeberg.org/user/repo"},
	}

	for _, c := range cases {
		got, err := normalizeGitURL(c.in)
		if err != nil {
			t.Fatalf("unexpected error for %s: %v", c.in, err)
		}
		if got != c.want {
			t.Fatalf("normalize(%s)=%s want %s", c.in, got, c.want)
		}
	}
}

func TestNormalizeGitURLInvalid(t *testing.T) {
	if _, err := normalizeGitURL("ftp://example.com"); err == nil {
		t.Fatalf("expected error for unsupported scheme")
	}
}
