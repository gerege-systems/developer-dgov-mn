// Package main нь Gerege Template Platform-ын API эхлэх цэг.
//
// Бүх суурь чадвар (танилт, RBAC, API gateway, AI pipeline, eID/SSO) нь
// github.com/gerege-systems/platform-core модульд байрлана — энэ репо нь
// тэрхүү суурийн лавлах хэрэгжилт (reference deployment) бөгөөд өөрийн
// нэмэлт маршрут байхгүй.
package main

import (
	"github.com/gerege-systems/platform-core/cmd/api/server"
	"github.com/gerege-systems/platform-core/core/constants"
	"github.com/gerege-systems/platform-core/pkg/logger"
)

func main() {
	// Telemetry-д энэ платформын нэрээр харагдана.
	server.ServiceName = "gerege-template"

	app, err := server.NewApp()
	if err != nil {
		logger.Fatal(err.Error(), logger.Fields{constants.LoggerCategory: constants.LoggerCategoryServer})
	}

	// Аппын өөрийн маршрутыг энд нэмнэ:
	//   app.Router().Route("/api/xxx", xxx.Routes(app.Pool()))

	if err := app.Run(); err != nil {
		logger.Fatal(err.Error(), logger.Fields{constants.LoggerCategory: constants.LoggerCategoryServer})
	}
}
