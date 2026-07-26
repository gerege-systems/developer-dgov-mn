// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import SwiftUI
import WebKit

// Gerege SSO нэвтрэлт — вэбтэй ЯГ ИЖИЛ урсгал, бүхэлдээ template BFF-ээр:
//   /api/auth/sso/start → Gerege SSO (нэвтрэлт) → /sso/callback (cookie суулгана)
//   → /me/dashboard.
// Апп нь SSO дээр өөрийн OIDC client БҮРТГҮҮЛЭХГҮЙ (native/PKCE урсгал байхгүй) —
// template-ийн вэб client-ийн логикийг тэр чигт нь ашиглана. Дашбоард руу шилжих
// агшинд навигацыг зогсоож, WKWebView-ийн cookie-г HTTPCookieStorage.shared руу
// хуулна: цаашид APIClient-ийн URLSession тэр session-оор ажиллана (вэб дашбоардыг
// апп дотор рендэрлэхгүй, native дэлгэц рүү шилжинэ).
struct SSOWebView: UIViewRepresentable {
    let onDone: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDone: onDone) }

    func makeUIView(context: Context) -> WKWebView {
        let web = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        web.navigationDelegate = context.coordinator
        web.load(URLRequest(url: APIClient.baseURL.appendingPathComponent("/api/auth/sso/start")))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let onDone: () -> Void
        private var finished = false

        init(onDone: @escaping () -> Void) { self.onDone = onDone }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            // Cookie суусны дараа BFF нь /me/dashboard руу шилжүүлнэ — вэб дашбоардыг
            // апп дотор нээхгүйн тулд яг энд зогсооно.
            if url.host == APIClient.baseURL.host, url.path.hasPrefix("/me"), !finished {
                finished = true
                decisionHandler(.cancel)
                Task { @MainActor in
                    await Self.syncCookies(from: webView)
                    onDone()
                }
                return
            }
            decisionHandler(.allow)
        }

        // WKWebView-ийн cookie store → HTTPCookieStorage.shared (URLSession уншина).
        @MainActor
        private static func syncCookies(from webView: WKWebView) async {
            let store = webView.configuration.websiteDataStore.httpCookieStore
            let cookies: [HTTPCookie] = await withCheckedContinuation { cont in
                store.getAllCookies { cont.resume(returning: $0) }
            }
            for c in cookies { HTTPCookieStorage.shared.setCookie(c) }
        }
    }
}
