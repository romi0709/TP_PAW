<?php
session_start();
require 'db.php';

$errors = [];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $username = trim($_POST["username"]);
    $email = trim($_POST["email"]);
    $password = $_POST["password"];
    $confirm = $_POST["confirm"];

    if (empty($username) || empty($email) || empty($password)) {
        $errors[] = "All fields required.";
    }

    if ($password !== $confirm) {
        $errors[] = "Passwords do not match.";
    }

    if (empty($errors)) {
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $username, $email, $hash);

        if ($stmt->execute()) {
            $_SESSION["user_id"] = $stmt->insert_id;
            $_SESSION["username"] = $username;
            header("Location: attendance.php");
            exit();
        } else {
            $errors[] = "Email or username already exists.";
        }
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Sign Up</title>
    <link rel="stylesheet" href="login.css">
</head>

<body>

    <div class="box">
        <h2>Sign Up</h2>

        <?php foreach ($errors as $e): ?>
        <p class="error"><?= $e ?></p>
        <?php endforeach; ?>

        <form action="" method="POST">

            <input type="text" name="username" placeholder="Username" required>

            <input type="email" name="email" placeholder="Email" required>

            <input type="password" name="password" placeholder="Password" required>

            <input type="password" name="confirm" placeholder="Confirm Password" required>

            <button type="submit">Create Account</button>

            <p>Already registered?
                <a href="login.php">Login</a>
            </p>

        </form>

    </div>

</body>

</html>