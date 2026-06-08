<?php
/**
 * PayPhone — Webhook de confirmación / página de retorno
 * PayPhone llama a esta URL tanto como redirect (GET) como webhook (POST).
 * Ruta: public_html/confirm.php
 */

// ── Configuración ───────────────────────────────────────────
$PAYPHONE_TOKEN = 'TU_APPKEY_PAYPHONE'; // ← mismo token que en payphone.php
$DOMINIO        = 'https://TU_DOMINIO.com';
$MAIL_DESTINO   = 'estaciondelsol.ec@gmail.com'; // ← correo del hotel

// ── Verificar parámetros ────────────────────────────────────
$paymentId           = $_REQUEST['id']                    ?? '';
$clientTransactionId = $_REQUEST['clientTransactionId']   ?? '';

if (!$paymentId || !$clientTransactionId) {
    // Llegó sin parámetros: redirigir al inicio
    header('Location: ' . $DOMINIO);
    exit();
}

$clientTransactionId = preg_replace('/[^A-Za-z0-9\-]/', '', $clientTransactionId);
$paymentId           = preg_replace('/[^A-Za-z0-9\-]/', '', $paymentId);

// ── Verificar transacción con PayPhone ──────────────────────
$verifyUrl = 'https://pay.payphonetodoestuaqui.com/button/V2/Confirm'
           . '?id=' . urlencode($paymentId)
           . '&clientTransactionId=' . urlencode($clientTransactionId);

$ch = curl_init($verifyUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $PAYPHONE_TOKEN],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$pp = json_decode($response, true) ?? [];
$aprobado = ($httpCode === 200 && ($pp['transactionStatus'] ?? '') === 'Approved');

// ── Actualizar archivo de reserva ───────────────────────────
$reservaDir  = __DIR__ . '/reservas';
$reservaFile = $reservaDir . '/' . $clientTransactionId . '.json';
$reserva     = [];

if (file_exists($reservaFile)) {
    $reserva = json_decode(file_get_contents($reservaFile), true) ?? [];
}

$reserva['estado']           = $aprobado ? 'confirmada' : 'fallida';
$reserva['payPhoneResponse'] = $pp;
$reserva['confirmadaEn']     = date('c');

file_put_contents($reservaFile, json_encode($reserva, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// ── Enviar emails si fue aprobado ───────────────────────────
if ($aprobado && !empty($reserva['email'])) {
    $codigoReserva = 'EDS-' . strtoupper(substr($clientTransactionId, -8));
    $nombre        = $reserva['nombre']    ?? 'Huésped';
    $referencia    = $reserva['referencia'] ?? '—';
    $total         = $reserva['totalUSD']   ?? '—';
    $emailHuesped  = $reserva['email'];

    // — Email al huésped —
    $asunto1 = "Reserva confirmada — Estación del Sol ($codigoReserva)";
    $mensaje1 = "Hola $nombre,\n\n"
              . "Tu reserva en Estación del Sol está confirmada.\n\n"
              . "  Código:      $codigoReserva\n"
              . "  Detalle:     $referencia\n"
              . "  Total:       \$$total USD\n\n"
              . "Christian te contactará pronto para coordinar tu llegada.\n"
              . "WhatsApp: +593 98 672 1666\n\n"
              . "¡Hasta pronto!\n— Estación del Sol\n"
              . "Las Núñez · Santa Elena · Ecuador";
    $headers1 = "From: reservas@TU_DOMINIO.com\r\n"
              . "Reply-To: estaciondelsol.ec@gmail.com\r\n"
              . "Content-Type: text/plain; charset=UTF-8";
    mail($emailHuesped, $asunto1, $mensaje1, $headers1);

    // — Email al hotel —
    $asunto2 = "Nueva reserva $codigoReserva — $nombre";
    $mensaje2 = "Nueva reserva confirmada:\n\n"
              . "  Código:    $codigoReserva\n"
              . "  Huésped:   {$nombre}\n"
              . "  Correo:    $emailHuesped\n"
              . "  Teléfono:  " . ($reserva['telefono'] ?? '—') . "\n"
              . "  Cédula:    " . ($reserva['cedula']   ?? '—') . "\n"
              . "  Detalle:   $referencia\n"
              . "  Total:     \$$total USD\n"
              . "  PayPhone:  $paymentId\n"
              . "  Fecha:     " . date('d/m/Y H:i') . "\n";
    $headers2 = "From: reservas@TU_DOMINIO.com\r\n"
              . "Content-Type: text/plain; charset=UTF-8";
    mail($MAIL_DESTINO, $asunto2, $mensaje2, $headers2);
}

// ── Si es llamada POST (webhook de PayPhone): responder 200 y salir ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    http_response_code(200);
    exit('OK');
}

// ── Si es GET (retorno del usuario): mostrar página ─────────
$codigoReserva = 'EDS-' . strtoupper(substr($clientTransactionId, -8));
?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $aprobado ? 'Reserva confirmada' : 'Pago no completado' ?> — Estación del Sol</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{--pacifico:#1B4965;--sol:#D4A574;--crema:#FAF6F0;--carbon:#2C3E50;--carbon-suave:#5A6C7D;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:var(--crema);color:var(--carbon);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;}
  .card{max-width:520px;width:100%;text-align:center;}
  .icon{width:96px;height:96px;margin:0 auto 2rem;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid <?= $aprobado ? 'var(--sol)' : '#e74c3c' ?>;}
  .icon svg{width:40px;height:40px;color:<?= $aprobado ? 'var(--sol)' : '#e74c3c' ?>;}
  h1{font-family:'Fraunces',serif;font-weight:300;font-size:2.25rem;color:var(--pacifico);margin-bottom:0.75rem;line-height:1.1;}
  h1 em{font-style:italic;color:var(--sol);}
  p{color:var(--carbon-suave);margin-bottom:0.5rem;line-height:1.6;}
  .codigo{font-family:'Fraunces',serif;font-size:1.25rem;color:var(--pacifico);letter-spacing:0.15em;margin:1.75rem auto;padding:1rem 1.5rem;background:rgba(212,165,116,0.12);border-radius:6px;display:inline-block;}
  .btn{display:inline-flex;align-items:center;padding:0.9rem 2rem;background:var(--pacifico);color:var(--crema);border-radius:100px;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:500;text-decoration:none;transition:background 0.3s;margin-top:1rem;}
  .btn:hover{background:var(--sol);color:var(--carbon);}
  .wa{display:inline-flex;align-items:center;gap:0.5rem;margin-top:1.25rem;color:var(--carbon-suave);font-size:0.9rem;text-decoration:none;}
  .wa:hover{color:#25D366;}
</style>
</head>
<body>
<div class="card">
  <?php if ($aprobado): ?>
  <div class="icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>
  </div>
  <h1>Reserva <em>confirmada</em></h1>
  <p>Tu pago fue procesado con éxito. Te enviamos los detalles a tu correo.</p>
  <p>Christian te contactará pronto para coordinar tu llegada.</p>
  <div class="codigo"><?= htmlspecialchars($codigoReserva) ?></div>
  <div>
    <a href="<?= $DOMINIO ?>" class="btn">Volver al inicio</a><br>
    <a href="https://wa.me/593986721666" class="wa" target="_blank">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      Escríbenos por WhatsApp
    </a>
  </div>
  <?php else: ?>
  <div class="icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
  </div>
  <h1>Pago <em>no completado</em></h1>
  <p>No se procesó ningún cobro. Puedes intentarlo nuevamente o escribirnos directamente.</p>
  <div>
    <a href="<?= $DOMINIO ?>#habitaciones" class="btn">Intentar de nuevo</a><br>
    <a href="https://wa.me/593986721666" class="wa" target="_blank">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      Reservar por WhatsApp
    </a>
  </div>
  <?php endif; ?>
</div>
</body>
</html>
