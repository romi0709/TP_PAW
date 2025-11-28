// attendance.js (CORRIGÉ)
// All logic: validation, add student, toggle, recalc, colors, save/load, report, jQuery interactions.
// redirect to login if not logged in
if (!localStorage.getItem("loggedInUser")) {
    window.location.href = "login.html";
}

(function ($) {
    const STORAGE_KEY = "attendance_full_data_v1";
    let reportChart = null;

    $(function () {
        // Attach events and load saved table
        loadTableFromStorage();
        reattachEvents();
        recalcAllRows();

        // ---------- Form submit ----------
        $("#addStudentForm").on("submit", function (e) {
            e.preventDefault();
            clearFormErrors();
            $("#successMessage").hide();

            const id = $("#studentId").val().trim();
            const last = $("#lastName").val().trim();
            const first = $("#firstName").val().trim();
            const email = $("#email").val().trim();

            let valid = true;

            if (!/^[0-9]+$/.test(id)) {
                valid = false; $("#idError").text("Student ID must contain only digits.");
            }
            if (!/^[A-Za-z]+$/.test(last)) {
                valid = false; $("#lastError").text("Last name must contain only letters.");
            }
            if (!/^[A-Za-z]+$/.test(first)) {
                valid = false; $("#firstError").text("First name must contain only letters.");
            }
            if (!/^\S+@\S+\.\S+$/.test(email)) {
                valid = false; $("#emailError").text("Invalid email format (name@example.com).");
            }

            if (!valid) return;

            addStudentRow(id, last, first);
            saveTableToStorage();

            $("#successMessage").text("Student successfully added!").show().fadeIn(200).delay(1500).fadeOut(800);
            this.reset();
        });

        // ---------- Show Report ----------
        $("#showReportBtn").on("click", function () {
            generateReport();
        });

        // ---------- Highlight excellent students (<3 absences) ----------
        $("#highlightBtn").on("click", function () {
            $("#attendanceTable tbody tr").each(function () {
                const tr = $(this);
                const abs = countAbsencesInRow(tr);
                if (abs < 3) {
                    tr.addClass("excellent");
                    tr.fadeOut(120).fadeIn(120);
                }
            });
        });

        // ---------- Reset colors / highlights ----------
        $("#resetBtn").on("click", function () {
            $("#attendanceTable tbody tr").removeClass("excellent green-row yellow-row red-row rowHover");
        });

        // ---------- Clear saved data ----------
        $("#clearStorageBtn").on("click", function () {
            if (confirm("Clear saved attendance data? This cannot be undone.")) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        });

        // ---------- Delegated hover ----------
        $("#attendanceTable tbody").on("mouseenter", "tr", function () { $(this).addClass("rowHover"); });
        $("#attendanceTable tbody").on("mouseleave", "tr", function () { $(this).removeClass("rowHover"); });

        // ---------- Row click (show info) ----------
        $("#attendanceTable tbody").on("click", "tr", function (e) {
            const $target = $(e.target);
            if ($target.hasClass("clickable") || $target.hasClass("deleteBtn") || $target.parent().hasClass("deleteBtn")) return;

            const tds = $(this).children("td");
            const last = tds.eq(1).text().trim();
            const first = tds.eq(2).text().trim();
            const abs = countAbsencesInRow($(this));
            alert("Student: " + first + " " + last + "\nAbsences: " + abs);
        });

        // ---------- Toggle attendance/participation ----------
        $("#attendanceTable tbody").on("click", "td.clickable", function (e) {
            e.stopPropagation();
            const td = $(this);
            td.text(td.text().trim() === "✓" ? "" : "✓");
            const row = td.closest("tr");
            updateRow(row);
            saveTableToStorage();
        });

        // ---------- Delete ----------
        $("#attendanceTable tbody").on("click", ".deleteBtn", function (e) {
            e.stopPropagation();
            if (confirm("Delete this student?")) {
                $(this).closest("tr").remove();
                saveTableToStorage();
                recalcAllRows();
            }
        });

        // ---------- Dark mode ----------
        $("#darkModeBtn").on("click", function () {
            $("body").toggleClass("dark");
            // optionally save state
            localStorage.setItem("darkMode", $("body").hasClass("dark") ? "1" : "0");
        });
        // restore dark mode
        if (localStorage.getItem("darkMode") === "1") $("body").addClass("dark");

        // ---------- Color panel toggle ----------
        $("#colorPickerBtn").on("click", function () {
            $("#colorPanel").toggleClass("hidden");
        });

        // ---------- Apply saved colors on startup ----------
        applyColors();

        // ---------- Save colors ----------
        $("#saveColors").on("click", function () {
            const primary = $("#primaryColor").val();
            const bg = $("#bgColor").val();
            const card = $("#cardColor").val();

            localStorage.setItem("primary", primary);
            localStorage.setItem("bg", bg);
            localStorage.setItem("card", card);

            applyColors();
            alert("Theme updated successfully!");
        });

        // ---------- Preset themes ----------
        $(".preset").on("click", function () {
            const btn = $(this);
            const primary = btn.data("primary");
            const bg = btn.data("bg");
            const card = btn.data("card");

            localStorage.setItem("primary", primary);
            localStorage.setItem("bg", bg);
            localStorage.setItem("card", card);

            applyColors();
            alert("Preset theme applied!");
        });

        // ---------- Search ----------
        $("#searchInput").on("keyup", function () {
            const value = $(this).val().toLowerCase();
            $("#attendanceTable tbody tr").filter(function () {
                const nameText = $(this).text().toLowerCase();
                $(this).toggle(nameText.indexOf(value) > -1);
            });
        });

        // ---------- Sort by absences (ASC) ----------
        $("#sortAbsences").on("click", function () {
            let rows = $("#attendanceTable tbody tr").get();
            rows.sort(function (a, b) {
                let absA = parseInt($(a).find(".abs-count").text()) || 0;
                let absB = parseInt($(b).find(".abs-count").text()) || 0;
                return absA - absB;
            });
            $.each(rows, function (idx, row) { $("#attendanceTable tbody").append(row); });
            $("#sortMessage").text("Currently sorted by absences (ascending)");
        });

        // ---------- Sort by participation (DESC) ----------
        $("#sortParticipation").on("click", function () {
            let rows = $("#attendanceTable tbody tr").get();
            rows.sort(function (a, b) {
                let parA = parseInt($(a).find(".par-count").text()) || 0;
                let parB = parseInt($(b).find(".par-count").text()) || 0;
                return parB - parA;
            });
            $.each(rows, function (idx, row) { $("#attendanceTable tbody").append(row); });
            $("#sortMessage").text("Currently sorted by participation (descending)");
        });

        // ---------- Export PDF ----------
        $("#exportPDF").on("click", function () {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("Attendance Report", 14, 10);
            doc.autoTable({ html: "#attendanceTable", startY: 20 });
            doc.save("attendance.pdf");
        });

        // ---------- Export Excel ----------
        $("#exportExcel").on("click", function () {
            const table = document.getElementById("attendanceTable");
            const workbook = XLSX.utils.table_to_book(table, { sheet: "Attendance" });
            XLSX.writeFile(workbook, "attendance.xlsx");
        });

    }); // end $(function)

    // ---------------- UTILITIES ----------------
    function clearFormErrors() {
        $("#idError,#lastError,#firstError,#emailError").text("");
    }

    function addStudentRow(id, last, first) {
        const $tr = $("<tr></tr>");
        $tr.append($("<td></td>").text(id));
        $tr.append($("<td></td>").text(last));
        $tr.append($("<td></td>").text(first));

        for (let i = 0; i < 6; i++) $tr.append($("<td></td>").addClass("clickable"));
        for (let i = 0; i < 6; i++) $tr.append($("<td></td>").addClass("clickable"));

        // Absences cell (with class)
        $tr.append($("<td></td>").addClass("abs-count").text("0"));

        // Participation count cell (with class)
        $tr.append($("<td></td>").addClass("par-count").text("0"));

        // Message
        $tr.append($("<td></td>").addClass("msg-cell").text(""));

        // Delete
        $tr.append($("<td></td>").append($("<button></button>").addClass("deleteBtn").text("X")));

        $("#attendanceTable tbody").append($tr);
        updateRow($tr);
    }

    function updateRow($tr) {
        // normalize classes
        $tr.removeClass("green-row yellow-row red-row");

        const tds = $tr.children("td");
        let absences = 0;
        for (let i = 3; i <= 8; i++) {
            if (tds.eq(i).text().trim() === "") absences++;
        }
        let participationCount = 0;
        for (let i = 9; i <= 14; i++) {
            if (tds.eq(i).text().trim() === "✓") participationCount++;
        }

        // set counts with classes
        tds.eq(15).text(absences).addClass("abs-count");
        tds.eq(16).text(participationCount).addClass("par-count");

        // message & color
        let message = "";
        if (absences >= 5) {
            $tr.addClass("red-row");
            message = "Excluded – too many absences – You need to participate more";
        } else if (absences >= 3) {
            $tr.addClass("yellow-row");
            message = "Warning – attendance low – You need to participate more";
        } else {
            $tr.addClass("green-row");
            message = (participationCount >= 4)
                ? "Good attendance – Excellent participation"
                : "Good attendance – Try to participate more";
        }
        tds.eq(17).text(message).addClass("msg-cell");
    }

    function recalcAllRows() {
        $("#attendanceTable tbody tr").each(function () {
            updateRow($(this));
        });
    }

    function countAbsencesInRow($tr) {
        let abs = 0;
        const tds = $tr.children("td");
        for (let i = 3; i <= 8; i++) {
            if (tds.eq(i).text().trim() === "") abs++;
        }
        return abs;
    }

    // ---------------- Storage ----------------
    function saveTableToStorage() {
        const html = $("#attendanceTable tbody").html();
        localStorage.setItem(STORAGE_KEY, html);
    }

    function loadTableFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            $("#attendanceTable tbody").html(saved);
        }
    }

    function reattachEvents() {
        $("#attendanceTable tbody tr").each(function () {
            const tds = $(this).children("td");
            // ensure clickable on attendance/participation cells
            for (let i = 3; i <= 14; i++) {
                tds.eq(i).addClass("clickable");
            }
            // ensure abs/par count cells exist and have classes
            if (tds.eq(15).length) tds.eq(15).addClass("abs-count");
            else $(this).append($("<td></td>").addClass("abs-count").text("0"));

            if (tds.eq(16).length) tds.eq(16).addClass("par-count");
            else $(this).append($("<td></td>").addClass("par-count").text("0"));

            // ensure message cell
            if (!tds.eq(17).length) $(this).append($("<td></td>").addClass("msg-cell"));

            // ensure delete button cell exists
            const totalTds = $(this).children("td").length;
            if (totalTds < 19) {
                $(this).append($("<td></td>").append($("<button></button>").addClass("deleteBtn").text("X")));
            }
        });

        // Recompute rows to populate counts/messages/colors
        recalcAllRows();
    }

    // ---------------- Report ----------------
    function generateReport() {
        const rows = $("#attendanceTable tbody tr");
        const total = rows.length;
        let presentCount = 0;
        let participatingCount = 0;

        rows.each(function () {
            const tds = $(this).children("td");
            let isPresent = false;
            for (let i = 3; i <= 8; i++) {
                if (tds.eq(i).text().trim() === "✓") { isPresent = true; break; }
            }
            if (isPresent) presentCount++;

            let hasParticipated = false;
            for (let j = 9; j <= 14; j++) {
                if (tds.eq(j).text().trim() === "✓") { hasParticipated = true; break; }
            }
            if (hasParticipated) participatingCount++;
        });

        $("#totalStudents").text(total);
        $("#presentStudents").text(presentCount);
        $("#participatingStudents").text(participatingCount);
        $("#reportSection").show();

        // Chart
        const ctx = document.getElementById("reportChart").getContext("2d");
        if (reportChart) reportChart.destroy();

        reportChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total', 'Present', 'Participated'],
                datasets: [{
                    label: 'Attendance Report',
                    data: [total, presentCount, participatingCount],
                    backgroundColor: ['#3b82f6', '#10b981', '#f97316']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, precision: 0 } }
            }
        });
    }

    // ---------------- Theme helper ----------------
    function applyColors() {
        document.documentElement.style.setProperty("--primary", localStorage.getItem("primary") || "#6c8ced");
        document.documentElement.style.setProperty("--bg", localStorage.getItem("bg") || "#eef3ff");
        document.documentElement.style.setProperty("--card", localStorage.getItem("card") || "rgba(255,255,255,0.65)");
    }

})(jQuery);
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
});
