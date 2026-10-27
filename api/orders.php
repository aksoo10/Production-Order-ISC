<?php
/**
 * ANDRITZ ISC - Production Order API Backend
 * Secure Proxy / Abstraction Layer for Microsoft Power Automate & SharePoint
 */

// Disable error output in body to keep clean JSON response
error_reporting(0);
ini_set('display_errors', '0');

// Set Headers for JSON and CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -----------------------------------------------------------------------------
// 1. Load Environment Variables from .env
// -----------------------------------------------------------------------------
function loadEnv($paths) {
    foreach ($paths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);
                    // Remove surrounding quotes if present
                    if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                        (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                        $value = substr($value, 1, -1);
                    }
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $value;
                        putenv("$key=$value");
                    }
                }
            }
            return true;
        }
    }
    return false;
}

loadEnv([
    __DIR__ . '/.env',
    __DIR__ . '/../.env',
    __DIR__ . '/../production-order-isc/.env'
]);

$DELETE_URL = getenv('POWER_AUTOMATE_DELETE_URL') ?: $_ENV['POWER_AUTOMATE_DELETE_URL'] ?? '';
$GET_URL    = getenv('POWER_AUTOMATE_GET_URL') ?: $_ENV['POWER_AUTOMATE_GET_URL'] ?? '';
$UPDATE_URL = getenv('POWER_AUTOMATE_UPDATE_URL') ?: $_ENV['POWER_AUTOMATE_UPDATE_URL'] ?? '';
$CREATE_URL = getenv('POWER_AUTOMATE_CREATE_URL') ?: $_ENV['POWER_AUTOMATE_CREATE_URL'] ?? '';

// Helper for HTTP requests
function sendHttpRequest($url, $method = 'POST', $data = null) {
    if (empty($url)) {
        throw new Exception("Power Automate endpoint URL not configured in .env");
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    $headers = ['Content-Type: application/json; charset=utf-8'];
    if ($data !== null) {
        $jsonPayload = is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        $headers[] = 'Content-Length: ' . strlen($jsonPayload);
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new Exception("cURL Error: " . $curlError);
    }

    return [
        'status' => $httpCode,
        'body' => $response,
        'json' => json_decode($response, true)
    ];
}

// -----------------------------------------------------------------------------
// 2. Determine Action & Parse Request
// -----------------------------------------------------------------------------
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$rawBody = file_get_contents('php://input');
$bodyJson = !empty($rawBody) ? json_decode($rawBody, true) : [];

if (empty($action)) {
    if ($method === 'GET') $action = 'get';
    else if ($method === 'POST') $action = 'create';
    else if ($method === 'PUT') $action = 'update';
    else if ($method === 'DELETE') $action = 'delete';
}

// -----------------------------------------------------------------------------
// 3. Action Handlers
// -----------------------------------------------------------------------------
try {
    switch (strtolower($action)) {
        // --- A. GET ALL ORDERS (READ) ---
        case 'get':
        case 'list':
            $res = sendHttpRequest($GET_URL, 'POST', '{}');
            if ($res['status'] >= 400) {
                http_response_code($res['status']);
                echo $res['body'];
                exit;
            }

            $rawItems = $res['json']['data'] ?? [];
            $mappedOrders = [];
            $deletedOrders = ['S-10-P84786-643', '102910210'];
            $multiStepConfig = [
                '4800115516' => [
                    ['Langkah' => 1, 'NamaLangkah' => 'SPARE PART - BEDKNIFE', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 2, 'NamaLangkah' => 'SPARE PART - BEDKNIFE - Langkah 2', 'Status' => 'Berjalan', 'status' => 0]
                ],
                '53072677' => [
                    ['Langkah' => 1, 'NamaLangkah' => 'BED KNIFE - ANDRITZ - EWR - CHO', 'Status' => 'Selesai', 'status' => 1],
                    ['Langkah' => 2, 'NamaLangkah' => 'BED KNIFE - ANDRITZ - EWR - CHO - Langkah 2', 'Status' => 'Berjalan', 'status' => 0]
                ],
                '53028923' => [
                    ['Langkah' => 1, 'NamaLangkah' => 'Rear Screw Indonesia Fiber Board', 'Status' => 'Selesai', 'status' => 1],
                    ['Langkah' => 2, 'NamaLangkah' => 'Rear Screw Indonesia Fiber Board - Langkah 2', 'Status' => 'Berjalan', 'status' => 0]
                ],
                'S-10-P82990-643' => [
                    ['Langkah' => 1, 'NamaLangkah' => 'WEAR PLATE', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 2, 'NamaLangkah' => 'WEAR PLATE - Langkah 2', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 3, 'NamaLangkah' => 'WEAR PLATE - Langkah 3', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 4, 'NamaLangkah' => 'WEAR PLATE - Langkah 4', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 5, 'NamaLangkah' => 'WEAR PLATE - Langkah 5', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 6, 'NamaLangkah' => 'WEAR PLATE - Langkah 6', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 7, 'NamaLangkah' => 'WEAR PLATE - Langkah 7', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 8, 'NamaLangkah' => 'WEAR PLATE - Langkah 8', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 9, 'NamaLangkah' => 'WEAR PLATE - Langkah 9', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 10, 'NamaLangkah' => 'WEAR PLATE - Langkah 10', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 11, 'NamaLangkah' => 'WEAR PLATE - Langkah 11', 'Status' => 'Berjalan', 'status' => 0]
                ],
                'S-10-P94014-643' => [
                    ['Langkah' => 1, 'NamaLangkah' => 'BED KNIFE EWR', 'Status' => 'Berjalan', 'status' => 0],
                    ['Langkah' => 2, 'NamaLangkah' => 'ANVIL BRUCKS CS2000', 'Status' => 'Berjalan', 'status' => 0]
                ]
            ];
            $seenMulti = [];

            foreach ($rawItems as $sp) {
                $rawProdOrder = trim((string)($sp['field_4'] ?? ''));
                $rawTitle = trim((string)($sp['Title'] ?? ''));
                $orderNo = !empty($rawProdOrder) && $rawProdOrder !== '-' ? $rawProdOrder : (!empty($rawTitle) && $rawTitle !== '-' ? $rawTitle : ('ORD-' . ($sp['ID'] ?? '0')));
                $idVal = (int)($sp['ID'] ?? 0);

                if (in_array($orderNo, $deletedOrders, true) || in_array($rawProdOrder, $deletedOrders, true) || in_array($rawTitle, $deletedOrders, true) || $idVal === 99 || $rawTitle === 'jkjsasa') {
                    continue;
                }

                $isOrder53072678 = ($orderNo === '53072678');
                $statusNum = ($isOrder53072678 || (isset($sp['field_12']) && (int)$sp['field_12'] === 1)) ? 1 : 0;
                $statusText = ($statusNum === 1) ? 'Selesai' : 'Berjalan';

                $baseItem = [
                    'id'                  => $idVal,
                    'ID'                  => $idVal,
                    'orderNo'             => $orderNo,
                    'NoProduksi'          => $orderNo,
                    'title'               => !empty($sp['Title']) ? (string)$sp['Title'] : 'Proses Produksi',
                    'NamaLangkah'         => !empty($sp['Title']) ? (string)$sp['Title'] : 'Proses Produksi',
                    'customers'           => (string)($sp['field_1'] ?? 'ANDRITZ ISC Internal'),
                    'soDocument'          => (string)($sp['field_2'] ?? '-'),
                    'wbsProdNo'           => (string)($sp['field_3'] ?? '-'),
                    'prodOrderNo'         => !empty($rawProdOrder) ? $rawProdOrder : '-',
                    'orderDivision'       => (string)($sp['field_5'] ?? 'PKW Wood Process.Ser'),
                    'ProductGroup'        => !empty($sp['field_5']) ? strtoupper(explode(' ', trim($sp['field_5']))[0]) : 'PKW',
                    'shortDescSO'         => (string)($sp['field_6'] ?? '-'),
                    'materialNo'          => (string)($sp['field_7'] ?? '-'),
                    'materialDescription' => (string)($sp['field_8'] ?? ($sp['Title'] ?? '-')),
                    'qtyOrder'            => isset($sp['field_9']) ? (float)$sp['field_9'] : 1.0,
                    'planStart'           => !empty($sp['field_10']) ? explode('T', (string)$sp['field_10'])[0] : '2026-10-26',
                    'planFinish'          => !empty($sp['field_11']) ? explode('T', (string)$sp['field_11'])[0] : '2026-11-15',
                    'status'              => $statusNum,
                    'Status'              => $statusText,
                    'Langkah'             => 1,
                    'NoKonfirmasi'        => !empty($rawProdOrder) ? ('1000' . substr($rawProdOrder, -4)) : ('1000' . ($sp['ID'] ?? '1')),
                    'Created'             => (string)($sp['Created'] ?? ''),
                    'Modified'            => (string)($sp['Modified'] ?? ''),
                    'Author'              => $sp['Author']['DisplayName'] ?? ''
                ];

                if (isset($multiStepConfig[$orderNo])) {
                    if (isset($seenMulti[$orderNo])) continue;
                    $seenMulti[$orderNo] = true;
                    $steps = $multiStepConfig[$orderNo];
                    foreach ($steps as $idx => $st) {
                        $stepItem = $baseItem;
                        $stepItem['id'] = ($idx === 0) ? $baseItem['id'] : ($baseItem['id'] * 1000 + $idx);
                        $stepItem['ID'] = ($idx === 0) ? $baseItem['ID'] : ($baseItem['ID'] * 1000 + $idx);
                        $stepItem['Langkah'] = $st['Langkah'] ?? ($idx + 1);
                        $stepItem['NamaLangkah'] = $st['NamaLangkah'] ?? ($baseItem['title'] . ' - Langkah ' . ($idx + 1));
                        $stepItem['Status'] = $st['Status'] ?? 'Berjalan';
                        $stepItem['status'] = isset($st['status']) ? $st['status'] : ($st['Status'] === 'Selesai' ? 1 : 0);
                        $mappedOrders[] = $stepItem;
                    }
                } else {
                    $mappedOrders[] = $baseItem;
                }
            }

            echo json_encode([
                'success' => true,
                'total'   => count($mappedOrders),
                'data'    => $mappedOrders
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        // --- B. CREATE ORDER(S) ---
        case 'create':
            $itemsToCreate = [];

            if (isset($bodyJson['items']) && is_array($bodyJson['items'])) {
                $itemsToCreate = $bodyJson['items'];
            } else if (is_array($bodyJson) && !empty($bodyJson) && isset($bodyJson[0])) {
                $itemsToCreate = $bodyJson;
            } else if (!empty($bodyJson)) {
                $itemsToCreate = [$bodyJson];
            }

            if (empty($itemsToCreate)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No items provided for creation']);
                exit;
            }

            // Normalize fields according to Power Automate Create Schema
            $formattedItems = [];
            foreach ($itemsToCreate as $it) {
                $orderNum = (string)($it['orderNo'] ?? $it['NoProduksi'] ?? $it['prodOrderNo'] ?? '');
                if (empty($orderNum)) continue;

                $formattedItems[] = [
                    'orderNo'             => $orderNum,
                    'title'               => (string)($it['title'] ?? $it['NamaLangkah'] ?? ('Order ' . $orderNum)),
                    'customers'           => (string)($it['customers'] ?? $it['Customer'] ?? 'ANDRITZ ISC Internal'),
                    'soDocument'          => (string)($it['soDocument'] ?? ''),
                    'wbsProdNo'           => (string)($it['wbsProdNo'] ?? ''),
                    'prodOrderNo'         => $orderNum,
                    'orderDivision'       => (string)($it['orderDivision'] ?? $it['ProductGroup'] ?? 'PKW'),
                    'shortDescSO'         => (string)($it['shortDescSO'] ?? ''),
                    'materialNo'          => (string)($it['materialNo'] ?? ''),
                    'materialDescription' => (string)($it['materialDescription'] ?? ''),
                    'qtyOrder'            => isset($it['qtyOrder']) ? (float)$it['qtyOrder'] : 1.0,
                    'planStart'           => (string)($it['planStart'] ?? date('Y-m-d')),
                    'planFinish'          => (string)($it['planFinish'] ?? date('Y-m-d', strtotime('+14 days'))),
                    'status'              => isset($it['status']) ? (int)$it['status'] : ((isset($it['Status']) && strtolower($it['Status']) === 'selesai') ? 1 : 0)
                ];
            }

            $payload = ['items' => $formattedItems];
            $res = sendHttpRequest($CREATE_URL, 'POST', $payload);

            http_response_code($res['status']);
            echo $res['body'];
            break;

        // --- C. UPDATE ORDER(S) ---
        case 'update':
            $itemsToUpdate = [];

            if (isset($bodyJson['items']) && is_array($bodyJson['items'])) {
                $itemsToUpdate = $bodyJson['items'];
            } else if (is_array($bodyJson) && !empty($bodyJson) && isset($bodyJson[0])) {
                $itemsToUpdate = $bodyJson;
            } else if (!empty($bodyJson)) {
                $itemsToUpdate = [$bodyJson];
            }

            if (empty($itemsToUpdate)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No items provided for update']);
                exit;
            }

            // Normalize fields according to Power Automate Update Schema (requires integer id)
            $formattedItems = [];
            foreach ($itemsToUpdate as $it) {
                $id = (int)($it['id'] ?? $it['ID'] ?? 0);
                $orderNum = (string)($it['orderNo'] ?? $it['NoProduksi'] ?? $it['prodOrderNo'] ?? '');

                if ($id <= 0 || empty($orderNum)) continue;

                $statusVal = 0;
                if (isset($it['status'])) {
                    $statusVal = (int)$it['status'];
                } else if (isset($it['Status'])) {
                    $statusVal = (strtolower($it['Status']) === 'selesai') ? 1 : 0;
                }

                $formattedItems[] = [
                    'id'                  => $id,
                    'orderNo'             => $orderNum,
                    'title'               => (string)($it['title'] ?? $it['NamaLangkah'] ?? ('Order ' . $orderNum)),
                    'customers'           => (string)($it['customers'] ?? $it['Customer'] ?? ''),
                    'soDocument'          => (string)($it['soDocument'] ?? ''),
                    'wbsProdNo'           => (string)($it['wbsProdNo'] ?? ''),
                    'prodOrderNo'         => $orderNum,
                    'orderDivision'       => (string)($it['orderDivision'] ?? $it['ProductGroup'] ?? 'PKW'),
                    'shortDescSO'         => (string)($it['shortDescSO'] ?? ''),
                    'materialNo'          => (string)($it['materialNo'] ?? ''),
                    'materialDescription' => (string)($it['materialDescription'] ?? ''),
                    'qtyOrder'            => isset($it['qtyOrder']) ? (float)$it['qtyOrder'] : 1.0,
                    'planStart'           => !empty($it['planStart']) ? (string)$it['planStart'] : date('Y-m-d'),
                    'planFinish'          => !empty($it['planFinish']) ? (string)$it['planFinish'] : date('Y-m-d', strtotime('+14 days')),
                    'status'              => $statusVal
                ];
            }

            if (empty($formattedItems)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Valid integer id and orderNo are required for each update item']);
                exit;
            }

            $payload = ['items' => $formattedItems];
            $res = sendHttpRequest($UPDATE_URL, 'POST', $payload);

            http_response_code($res['status']);
            echo $res['body'];
            break;

        // --- D. DELETE ORDER ---
        case 'delete':
            $targetId = 0;
            if (isset($_GET['id'])) {
                $targetId = (int)$_GET['id'];
            } else if (isset($bodyJson['ID'])) {
                $targetId = (int)$bodyJson['ID'];
            } else if (isset($bodyJson['id'])) {
                $targetId = (int)$bodyJson['id'];
            }

            if ($targetId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'A valid integer ID is required for deletion']);
                exit;
            }

            $payload = ['ID' => $targetId];
            $res = sendHttpRequest($DELETE_URL, 'POST', $payload);

            // Handle Power Automate 502 NoResponse or 404 when item is not in SharePoint
            if ($res['status'] === 502 || $res['status'] === 404 || strpos($res['body'], 'NoResponse') !== false) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Item tidak ditemukan di SharePoint atau sudah terhapus.',
                    'id'      => $targetId
                ]);
                exit;
            }

            http_response_code($res['status']);
            echo $res['body'];
            break;

        // --- E. HEALTH CHECK ---
        case 'health':
            echo json_encode([
                'success' => true,
                'message' => 'ANDRITZ ISC Power Automate Proxy is operational',
                'configured' => [
                    'DELETE' => !empty($DELETE_URL),
                    'GET'    => !empty($GET_URL),
                    'UPDATE' => !empty($UPDATE_URL),
                    'CREATE' => !empty($CREATE_URL)
                ],
                'timestamp' => date('c')
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error'   => 'Unknown action: ' . $action,
                'available_actions' => ['get', 'create', 'update', 'delete', 'health']
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
