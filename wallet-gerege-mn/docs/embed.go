// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Package docs нь wallet API-ийн OpenAPI специйг binary дотор embed хийнэ
// (cmd/api нь /openapi.yaml дээр үйлчилнэ).
package docs

import _ "embed"

//go:embed openapi.yaml
var OpenAPISpec []byte
