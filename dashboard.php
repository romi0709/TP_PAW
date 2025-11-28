<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    // pas connecté → retour login
    header("Location: login.php");
    exit();
}
?>
<h2>Welcome, <?php echo $_SESSION['fullname']; ?>!</h2>