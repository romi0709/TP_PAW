<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost","root","","attendance_db"); // Changez le nom DB si besoin
if($conn->connect_error){
    echo json_encode(["success"=>false,"error"=>$conn->connect_error]);
    exit;
}

$id = $_POST['id'] ?? '';
$last = $_POST['last_name'] ?? '';
$first = $_POST['first_name'] ?? '';
$email = $_POST['email'] ?? '';

// Validation simple
if(empty($id) || empty($last) || empty($first) || empty($email)){
    echo json_encode(["success"=>false,"error"=>"Missing fields"]);
    exit;
}

$sql = "INSERT INTO students (id,last_name,first_name,email) VALUES (?,?,?,?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("isss", $id, $last, $first, $email);

if($stmt->execute()){
    echo json_encode(["success"=>true]);
}else{
    echo json_encode(["success"=>false,"error"=>$stmt->error]);
}
?>