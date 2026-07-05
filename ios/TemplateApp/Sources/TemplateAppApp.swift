// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import SwiftUI

@main
struct TemplateAppApp: App {
    @StateObject private var state = AppState()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                // App2App буцах deeplink (geregetemp://eid/callback) — Gerege eID
                // апп approve хийгээд RP апп руу буцахад ирнэ. Хүлээж буй eID
                // урсгалд мэдэгдэж, session-ыг шууд шалгуулна.
                .onOpenURL { url in
                    if url.scheme == "geregetemp" {
                        NotificationCenter.default.post(name: .eidReturn, object: nil)
                    }
                }
        }
    }
}

// AppState — session-ий эх төлөв. user байвал нэвтэрсэн, эс бол Login харуулна.
@MainActor
final class AppState: ObservableObject {
    @Published var user: MeUser?
    @Published var summary: EidSummary?
    @Published var loading = true

    // Апп нээгдэхэд cookie session хүчинтэй эсэхийг /api/me-ээр шалгана.
    func restore() async {
        loading = true
        defer { loading = false }
        if let u = try? await APIClient.shared.me() {
            user = u
            summary = try? await APIClient.shared.eidSummary()
        } else {
            user = nil
        }
    }

    // Нэвтрэлт амжилттай (cookie суусан) болсны дараа профайлыг татна.
    func onAuthenticated() async {
        if let u = try? await APIClient.shared.me() {
            user = u
            summary = try? await APIClient.shared.eidSummary()
        }
    }

    func signOut() async {
        await APIClient.shared.logout()
        user = nil
        summary = nil
    }
}

// RootView — session-ий дагуу Login эсвэл Home.
struct RootView: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        Group {
            if state.loading {
                ProgressView().controlSize(.large)
            } else if state.user != nil {
                HomeView()
            } else {
                LoginView()
            }
        }
        .animation(.default, value: state.user?.id)
        .task { await state.restore() }
    }
}
