// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import Foundation

// APIClient нь Gerege Template Platform-ийн BFF (https://template.gerege.mn/api/*)-тай
// харьцана — backend-тэй шууд БИШ. SSO нэвтрэлт ч мөн энэ BFF-ээр (SSOWebView).
// Нэвтрэлт нь httpOnly cookie (dgov_access/refresh)-д хадгалагдана; URLSession
// нь HTTPCookieStorage.shared-д cookie-г автоматаар хадгалж, дараагийн хүсэлтэд
// илгээдэг. BFF-ийн mutating route нь `x-dgov-csrf: 1` header шаарддаг (Origin
// header байхгүй тул энэ л хангалттай — checkOrigin-ыг хар). Токен клиент рүү
// хэзээ ч гарахгүй — session бүхэлдээ cookie дээр суурилна.
enum APIError: Error, LocalizedError {
    case http(Int, String)
    case decoding
    case network(String)
    var errorDescription: String? {
        switch self {
        case .http(let c, let m): return "Алдаа (\(c)): \(m)"
        case .decoding: return "Хариу задлахад алдаа."
        case .network(let m): return "Сүлжээний алдаа: \(m)"
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    // Production BFF. Локал туршилтад http://localhost:3000 болгож болно.
    static let baseURL = URL(string: "https://template.gerege.mn")!

    private let session: URLSession

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.httpCookieStorage = HTTPCookieStorage.shared
        cfg.httpCookieAcceptPolicy = .always
        cfg.httpShouldSetCookies = true
        cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: cfg)
    }

    // MARK: - Requests

    private func request(_ path: String, method: String, body: [String: Any]? = nil) async throws -> (Data, HTTPURLResponse) {
        var req = URLRequest(url: Self.baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if method != "GET" {
            req.setValue("1", forHTTPHeaderField: "x-dgov-csrf") // checkOrigin шаардлага
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body ?? [:])
        }
        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw APIError.network("хариу байхгүй") }
            return (data, http)
        } catch let e as APIError {
            throw e
        } catch {
            throw APIError.network(error.localizedDescription)
        }
    }

    // Envelope { data: T }-ийг задалж T буцаана.
    private func decodeData<T: Decodable>(_ data: Data, _ http: HTTPURLResponse) throws -> T {
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode(Envelope<EmptyPayload>.self, from: data))?.message ?? ""
            throw APIError.http(http.statusCode, msg)
        }
        guard let env = try? JSONDecoder().decode(Envelope<T>.self, from: data), let payload = env.data else {
            throw APIError.decoding
        }
        return payload
    }
    struct EmptyPayload: Decodable {}

    // MARK: - Auth / profile

    // Backend /users/me нь data-г { "user": {…} } гэж боож буцаадаг.
    private struct MeWrapper: Decodable { let user: MeUser }
    func me() async throws -> MeUser {
        let (data, http) = try await request("/api/me", method: "GET")
        let wrapped: MeWrapper = try decodeData(data, http)
        return wrapped.user
    }

    func eidSummary() async throws -> EidSummary? {
        let (data, http) = try await request("/api/me/eid/summary", method: "GET")
        if http.statusCode == 403 { return nil } // PKI_READ эрхгүй
        return try? decodeData(data, http)
    }

    func logout() async {
        _ = try? await request("/api/auth/logout", method: "POST", body: [:])
        // Локал cookie-г цэвэрлэнэ (BFF-ийн домэйн).
        guard let host = Self.baseURL.host, let cookies = HTTPCookieStorage.shared.cookies else { return }
        for c in cookies where host.hasSuffix(c.domain) || c.domain.hasSuffix(host) {
            HTTPCookieStorage.shared.deleteCookie(c)
        }
    }
}
