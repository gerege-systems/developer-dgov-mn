// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package main

import "testing"

func TestIsSafeWebhookURL(t *testing.T) {
	cases := []struct {
		name string
		url  string
		safe bool
	}{
		{"public ip https", "https://8.8.8.8/hook", true},
		{"http rejected", "http://8.8.8.8/hook", false},
		{"loopback rejected", "https://127.0.0.1/hook", false},
		{"loopback ipv6 rejected", "https://[::1]/hook", false},
		{"private 10.x rejected", "https://10.0.0.5/hook", false},
		{"private 192.168 rejected", "https://192.168.1.1/hook", false},
		{"private 172.16 rejected", "https://172.16.0.1/hook", false},
		{"link-local rejected", "https://169.254.1.1/hook", false},
		{"unspecified rejected", "https://0.0.0.0/hook", false},
		{"empty rejected", "", false},
		{"no scheme rejected", "8.8.8.8/hook", false},
		{"garbage rejected", "ht!tp://bad", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isSafeWebhookURL(c.url); got != c.safe {
				t.Fatalf("isSafeWebhookURL(%q) = %v, want %v", c.url, got, c.safe)
			}
		})
	}
}

func TestHmacHexKnownVector(t *testing.T) {
	// RFC 4231-маягийн тогтмол вектор: secret="key", body тогтмол.
	got := hmacHex("key", "The quick brown fox jumps over the lazy dog")
	want := "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
	if got != want {
		t.Fatalf("hmacHex = %s, want %s", got, want)
	}
}

func TestHmacHexDeterministic(t *testing.T) {
	a := hmacHex("s", "payload")
	b := hmacHex("s", "payload")
	if a != b {
		t.Fatal("hmac must be deterministic")
	}
	if hmacHex("s1", "payload") == hmacHex("s2", "payload") {
		t.Fatal("different secret must yield different hmac")
	}
}
