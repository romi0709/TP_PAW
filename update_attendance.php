<?php
require 'db.php';

$id = intval($_POST['id']);

// s1..s6, p1..p6 attendus en POST
$s = [];
$p = [];
for ($i = 1; $i <= 6; $i++) {
    $s[$i] = isset($_POST["s$i"]) ? 1 : 0;
    $p[$i] = isset($_POST["p$i"]) ? 1 : 0;
}

// construire requête dynamique
$sql = "UPDATE students SET 
    s1=?,s2=?,s3=?,s4=?,s5=?,s6=?,
    p1=?,p2=?,p3=?,p4=?,p5=?,p6=? WHERE id=?";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param(
    "iiiiiiiiiiiii",
    $s[1],$s[2],$s[3],$s[4],$s[5],$s[6],
    $p[1],$p[2],$p[3],$p[4],$p[5],$p[6],
    $id
);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => $stmt->error]);
}

$stmt->close();
?>