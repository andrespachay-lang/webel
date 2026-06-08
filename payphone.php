<?php
/**
 * PayPhone — Crear transacción
 * Coloca tu AppKey (token) en la variable $PAYPHONE_TOKEN.
 * Ruta: public_html/payphone.php
 */

header('Content-Type: application/json; charset=utf-8');

// ── Seguridad: solo acepta peticiones de tu propio dominio ──
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = 'https://TU_DOMINIO.com'; // ← cambia al dominio real en Hostinger
if (!empty($origin) && $origin !== $allowed) {
    http_response_code(403);
    exit(json_encode(['error' => 'Origen no permitido']));
}
header('Access-Control-Allow-Origin: ' . $allowed);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Método no permitido']));
}

// ── Configuración PayPhone ──────────────────────────────────
$PAYPHONE_TOKEN = 'TU_APPKEY_PAYPHONE'; // ← pega tu token de PayPhone aquí
$PAYPHONE_URL   = 'https://pay.payphonetodoestuaqui.com/button/Chek';
$DOMINIO        = 'https://TU_DOMINIO.com'; // ← igual que $allowed

// ── Leer cuerpo de la petición ──────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    exit(json_encode(['error' => 'Cuerpo inválido']));
}

// Campos requeridos
$required = ['totalCentavos', 'subtotalCentavos', 'ivaCentavos',
             'clientTransactionId', 'nombre', 'email', 'telefono',
             'cedula', 'referencia'];
foreach ($required as $f) {
    if (empty($body[$f])) {
        http_response_code(400);
        exit(json_encode(['error' => "Campo requerido: $f"]));
    }
}

// ── Validaciones básicas ────────────────────────────────────
$total = (int) $body['totalCentavos'];
if ($total < 100) { // mínimo $1.00
    http_response_code(400);
    exit(json_encode(['error' => 'Monto inválido']));
}

// Sanitizar
$clientTransactionId = preg_replace('/[^A-Za-z0-9\-]/', '', $body['clientTransactionId']);
$email    = filter_var($body['email'], FILTER_SANITIZE_EMAIL);
$telefono = preg_replace('/[^0-9+]/', '', $body['telefono']);
$cedula   = preg_replace('/[^A-Za-z0-9]/', '', $body['cedula']);
$nombre   = htmlspecialchars(substr($body['nombre'], 0, 80), ENT_QUOTES);
$referencia = htmlspecialchars(substr($body['referencia'], 0, 100), ENT_QUOTES);

// ── Payload para PayPhone ───────────────────────────────────
$payload = [
    'amount'               => $total,
    'amountWithTax'        => (int) $body['subtotalCentavos'],
    'amountWithoutTax'     => 0,
    'tax'                  => (int) $body['ivaCentavos'],
    'service'              => 0,
    'tip'                  => 0,
    'currency'             => 'USD',
    'clientTransactionId'  => $clientTransactionId,
    'reference'            => $referencia,
    'lang'                 => 'es',
    'email'                => $email,
    'mobilePhone'          => $telefono,
    'documentId'           => $cedula,
    'responseUrl'          => $DOMINIO . '/confirm.php',
    'cancellationUrl'      => $DOMINIO . '/?cancelado=1',
];

// ── Llamada a PayPhone ──────────────────────────────────────
$ch = curl_init($PAYPHONE_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $PAYPHONE_TOKEN,
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    exit(json_encode(['error' => 'Error de conexión con PayPhone', 'detalle' => $curlErr]));
}

$pp = json_decode($response, true);

if ($httpCode !== 200 || empty($pp['paymentId'])) {
    http_response_code(502);
    exit(json_encode(['error' => 'PayPhone rechazó la transacción', 'detalle' => $pp]));
}

// ── Guardar reserva pendiente ───────────────────────────────
$reservaDir = __DIR__ . '/reservas';
if (!is_dir($reservaDir)) {
    mkdir($reservaDir, 0750, true);
    // Bloquear acceso web directo
    file_put_contents($reservaDir . '/.htaccess', "Deny from all\n");
}

$reserva = [
    'paymentId'           => $pp['paymentId'],
    'clientTransactionId' => $clientTransactionId,
    'estado'              => 'pendiente',
    'nombre'              => $nombre,
    'email'               => $email,
    'telefono'            => $telefono,
    'cedula'              => $cedula,
    'referencia'          => $referencia,
    'totalUSD'            => number_format($total / 100, 2),
    'creadaEn'            => date('c'),
];
file_put_contents(
    $reservaDir . '/' . $clientTransactionId . '.json',
    json_encode($reserva, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

// ── Devolver URL de pago al frontend ───────────────────────
echo json_encode([
    'paymentId'      => $pp['paymentId'],
    'payWithPayPhone' => $pp['payWithPayPhone'],
]);
