// Subpath deployment (жишээ нь template.gerege.mn/wallet-admin) үед клиент талын
// fetch/location URL-уудад basePath-ийг урдаас нь залгана. NEXT_PUBLIC_* нь build
// үед инлайн орно; next/link болон router.push автоматаар basePath нэмдэг тул
// зөвхөн гар fetch/window.location дуудлагуудад л хэрэглэнэ.
export const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
