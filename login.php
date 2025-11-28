<?php
session_start();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Login</title>
    <link rel="stylesheet" href="login.css">
</head>

<body>

    <div class="box">
        <h2>Login</h2>

        <form action="login_action.php" method="POST">

            <input type="email" name="email" placeholder="Email" required>

            <input type="password" name="password" placeholder="Password" required>

            <button type="submit">Login</button>

            <p>Don't have an account?
                <a href="signup.php">Sign Up</a>
            </p>
        </form>

    </div>

</body>

</html>