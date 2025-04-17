<?php
require("../../e/member/class/user.php");
require("../../e/class/qinfofun.php");

// 设置响应头为 JSON 格式
header('Content-Type: application/json; charset=utf-8');

$mid = '10';

//是否登陆
$user=islogin();
// 用户信息
// $r=ReturnUserInfo($user['userid']);

// 获取 id 参数
$id = isset($_GET['id']) ? $_GET['id'] : null;

// 检查参数是否存在
if ($id === null) {
    // 如果参数不存在，返回错误信息
    $response = [
        's' => 1,
        'm' => '参数错误'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 验证 id 是否为有效的正整数
if (!is_numeric($id) || $id <= 0 || floor($id) != $id) {
    $response = [
        's' => 1,
        'm' => '参数格式错误'
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 防止SQL注入
$id = intval($id);

// 查询指定id的信息
// title = hash, titlepic = 引用id
$sql = "SELECT id, title, newstime, isdeleted, hash, filetype, url
        FROM phome_ecms_file
        WHERE id = $id AND userid = {$user['userid']}
        LIMIT 1";

try {
    $result = $empire->query($sql);
    $data = null;

    // 数字字段列表
    $numeric_fields = ['newstime', 'lastdotime', 'isdeleted', 'id']; // 添加id到数字字段

    // 帝国CMS的查询结果需要循环获取 (虽然我们期望只有一条)
    // 使用关联数组模式，去除数字索引
    if ($row = $empire->fetch($result)) {
        // 创建一个只包含关联索引的新数组
        $clean_row = [];
        foreach ($row as $key => $value) {
            // 只保留字符串键（关联索引）
            if (!is_numeric($key)) {
                // 对数字字段进行类型转换
                if (in_array($key, $numeric_fields) && is_numeric($value)) {
                    $clean_row[$key] = (int)$value; // 或者用 (float)$value 对于小数
                } else {
                     // 注释掉对 newstext 的特殊处理，因为我们没有选择这个字段
                    // if ($key == 'newstext') {
                    //     // 先处理帝国CMS的特殊值，然后添加反斜杠
                    //     $newstext = DoReqValue($mid,'newstext',stripSlashes($value));
                    //     $clean_row[$key] = addslashes($newstext);
                    // } else {
                         $clean_row[$key] = $value;
                    // }
                }
            }
        }
        $data = $clean_row;
    }

    // 返回成功响应
    $response = [
        's' => 0,
        'd' => $data // 如果没有找到记录，这里会是 null
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
