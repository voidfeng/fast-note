<?php
require("../../e/member/class/user.php");
require("../../e/class/qinfofun.php");

// 设置响应头为 JSON 格式
header('Content-Type: application/json; charset=utf-8');


//是否登陆
$user=islogin();
// 用户信息
// $r=ReturnUserInfo($user['userid']);

// 获取 lastdotime 参数
$lastdotime = isset($_GET['lastdotime']) ? $_GET['lastdotime'] : null;

// 检查参数是否存在
if ($lastdotime === null) {
    // 如果参数不存在，返回错误信息
    $response = [
        's' => 1,
        'm' => '参数错误'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 验证 lastdotime 是否为有效的 ISO 8601 格式或时间戳
$timestamp = null;
if (is_numeric($lastdotime) && strlen($lastdotime) === 10) {
    // 兼容旧的时间戳格式
    $timestamp = intval($lastdotime);
} else {
    // 尝试解析 ISO 8601 格式
    $timestamp = strtotime($lastdotime);
    if ($timestamp === false) {
        $response = [
            's' => 1,
            'm' => '参数格式错误，请使用 ISO 8601 格式'
        ];
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 检查时间戳是否在合理范围内
$minTimestamp = strtotime('2000-01-01');
$maxTimestamp = time();

if ($timestamp < $minTimestamp || $timestamp > $maxTimestamp) {
    $response = [
        's' => 1,
        'm' => '参数值超出范围'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 使用转换后的时间戳进行查询
$lastdotime = $timestamp;

// 查询大于等于指定lastdotime的信息列表
$sql = "SELECT id, title, classid, newstime, titlepic, newstext, lastdotime, version, uuid, puuid, type, isdeleted, islocked
        FROM phome_ecms_note
        WHERE lastdotime > $lastdotime AND userid = {$user['userid']}
        ORDER BY lastdotime ASC";

try {
    $result = $empire->query($sql);
    $data = [];

    // 数字字段列表（lastdotime 和 newstime 将转换为 ISO 8601 字符串）
    $numeric_fields = ['id', 'classid', 'version', 'isdeleted', 'islocked'];
    $iso_fields = ['lastdotime', 'newstime']; // 需要转换为 ISO 8601 的字段

    // 帝国CMS的查询结果需要循环获取
    // 使用关联数组模式，去除数字索引
    while ($row = $empire->fetch($result)) {    
        // 创建一个只包含关联索引的新数组
        $clean_row = [];
        foreach ($row as $key => $value) {
            // 只保留字符串键（关联索引）
            if (!is_numeric($key)) {
                // 对数字字段进行类型转换
                if (in_array($key, $numeric_fields) && is_numeric($value)) {
                    $clean_row[$key] = (int)$value;
                } elseif (in_array($key, $iso_fields) && is_numeric($value)) {
                    // 将时间戳转换为 ISO 8601 格式
                    $clean_row[$key] = date('c', (int)$value);
                } else {
                    if ($key == 'newstext') {
                        // 先处理帝国CMS的特殊值，然后添加反斜杠
                        $newstext = DoReqValue('9','newstext',stripSlashes($value));
                        $clean_row[$key] = addslashes($newstext);
                    } else {
                        $clean_row[$key] = $value;
                    }
                }
            }
        }
        $data[] = $clean_row;
    }

    // 获取最新的lastdotime值用于下次请求
    $new_lastdotime = $lastdotime;
    if (count($data) > 0) {
        $last_item = end($data);
        // 如果返回的是 ISO 8601 格式，需要转换为时间戳用于下次查询
        $last_lastdotime = $last_item['lastdotime'];
        if (is_string($last_lastdotime)) {
            $new_lastdotime = strtotime($last_lastdotime);
        } else {
            $new_lastdotime = $last_lastdotime;
        }
    }

    // 返回成功响应
    $response = [
        's' => 0,
        'lastdotime' => date('c', $new_lastdotime), // 返回 ISO 8601 格式
        'count' => count($data),
        'd' => $data
    ];

    // 输出 JSON 响应
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    $response = [
        's' => 1,
        'm' => '服务器内部错误'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
