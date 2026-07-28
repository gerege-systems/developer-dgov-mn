// Package main нь Government Developer Portal-ын API эхлэх цэг.
//
// Бүх суурь чадвар (танилт, RBAC, API gateway, OIDC provider, eID proxy,
// AI pipeline) нь github.com/gerege-systems/public-gerege-core модульд байрлана.
// Энэ апп нь зөвхөн өөрийн онцлогийг нэмнэ.
package main

import (
	"github.com/gerege-systems/public-gerege-core/cmd/api/server"
	"github.com/gerege-systems/public-gerege-core/core/constants"
	"github.com/gerege-systems/public-gerege-core/pkg/logger"
)

func main() {
	// Telemetry-д энэ платформын нэрээр харагдана.
	server.ServiceName = "government-developer-portal"

	app, err := server.NewApp()
	if err != nil {
		logger.Fatal(err.Error(), logger.Fields{constants.LoggerCategory: constants.LoggerCategoryServer})
	}

	// Аппын өөрийн маршрутыг энд нэмнэ:
	//   app.Router().Route("/api/x", x.Routes(app.Pool()))

	if err := app.Run(); err != nil {
		logger.Fatal(err.Error(), logger.Fields{constants.LoggerCategory: constants.LoggerCategoryServer})
	}
}
