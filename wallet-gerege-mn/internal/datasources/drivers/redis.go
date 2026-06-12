// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

package drivers

import "github.com/redis/go-redis/v9"

// OpenRedis нь auth-тай хуваалцсан Redis рүү client үүсгэнэ (token revocation
// denylist унших). host хоосон бол nil буцаана — дуудагч revocation алгасна.
func OpenRedis(host, password string) *redis.Client {
	if host == "" {
		return nil
	}
	return redis.NewClient(&redis.Options{
		Addr:     host,
		Password: password,
		DB:       0,
	})
}
