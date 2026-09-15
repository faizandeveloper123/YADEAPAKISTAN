<?php
/**
 * EVEE CRM — SMTP mail configuration
 *
 * Outbound mail is sent through the website's own mailbox so SPF/DKIM stay
 * aligned and messages land in the inbox instead of spam:
 *
 *   HOST     mail.yadea.com.pk     (cPanel / Exim)
 *   PORT     465                   (SSL / SMTPS)
 *   USER     crm@yadea.com.pk
 *
 * The mailbox PASSWORD is NEVER stored in this file. It is resolved from:
 *   1. api/mail_secrets.php  — gitignored, used on local/dev machines, or
 *   2. the SMTP_PASS environment variable — used by the deploy workflow on
 *      the production server (injected from the GitHub SMTP_PASS secret).
 *
 * Every value may be overridden with the matching environment variable.
 * When SMTP_HOST is empty the app falls back to PHP mail(), so nothing
 * breaks before credentials are configured.
 */

define('SMTP_HOST', getenv('SMTP_HOST') ?: 'mail.yadea.com.pk');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 465));
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'ssl'); // 'ssl' | 'tls' | ''
define('SMTP_USER', getenv('SMTP_USER') ?: 'crm@yadea.com.pk');

// Local/dev password (gitignored). Falls through to SMTP_PASS for production.
if (is_file(__DIR__ . '/mail_secrets.php')) {
    require_once __DIR__ . '/mail_secrets.php';
}
if (!defined('SMTP_PASS')) {
    define('SMTP_PASS', (string)getenv('SMTP_PASS'));
}

/** Display name shown in recipients' inboxes. */
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Yadea Pakistan');

/**
 * Team addresses that receive every form-submission / registration
 * notification (semicolon- or comma-separated). The CRM mailbox is always
 * first; add any personal addresses that should also get a copy. Fall back
 * to the mailbox alone when the env var is empty.
 */
define('MAIL_NOTIFY_TO', getenv('MAIL_NOTIFY_TO') ?: 'crm@yadea.com.pk;gunb07912@gmail.com');

/** Public app URL used for links inside emails (no trailing slash). */
define('APP_URL', getenv('APP_URL') ?: 'http://169.58.191.84/Yadea');

/**
 * Wire OpenSSL's CA store so encrypted SMTP (verify_peer ON) succeeds on
 * stock XAMPP, whose php.ini leaves openssl.cafile empty and curl.cainfo
 * pointing at a bundle Apache does not expose to PHP. Without this PHPMailer
 * aborts the TLS handshake with "Could not connect to SMTP host", so no
 * message ever leaves the box.
 */
$ca_bundle = __DIR__ . '/lib/cacert.pem';
if (is_file($ca_bundle)) {
    if (ini_set('openssl.cafile', $ca_bundle) === false) {
        // ini_set banned (hardened host): fall back to env vars honouring
        // the openssl stream wrapper on most builds.
        putenv('SSL_CERT_FILE=' . $ca_bundle);
        putenv('CURL_CA_BUNDLE=' . $ca_bundle);
    }
}