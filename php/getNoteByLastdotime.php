<?php
require("../../e/member/class/user.php");

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

// 验证 lastdotime 是否为有效的秒级时间戳
if (!is_numeric($lastdotime) || strlen($lastdotime) !== 10 || $lastdotime <= 0) {
    $response = [
        's' => 1,
        'm' => '参数格式错误'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 可选：检查时间戳是否在合理范围内（例如不早于2000年，不晚于当前时间）
$minTimestamp = strtotime('2000-01-01');
$maxTimestamp = time();

if ($lastdotime < $minTimestamp || $lastdotime > $maxTimestamp) {
    $response = [
        's' => 1,
        'm' => '参数值超出范围'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 防止SQL注入
$lastdotime = intval($lastdotime);

// 查询大于等于指定lastdotime的信息列表
$sql = "SELECT id, title, classid, newstime, titlepic, smalltext, lastdotime, version, uuid, puuid, type, isdeleted
        FROM phome_ecms_note
        WHERE lastdotime > $lastdotime AND userid = {$user['userid']}
        ORDER BY lastdotime ASC";

try {
    $result = $empire->query($sql);
    $data = [];

    // 数字字段列表
    $numeric_fields = ['id', 'classid', 'newstime', 'lastdotime', 'version', 'isdeleted'];

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
                    $clean_row[$key] = (int)$value; // 或者用 (float)$value 对于小数
                } else {
                    $clean_row[$key] = $value;
                }
            }
        }
        $data[] = $clean_row;
    }

    // 获取最新的lastdotime值用于下次请求
    $new_lastdotime = $lastdotime;
    if (count($data) > 0) {
        $last_item = end($data);
        $new_lastdotime = $last_item['lastdotime'];
    }

    // 返回成功响应
    $response = [
        's' => 0,
        'lastdotime' => $new_lastdotime,
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
