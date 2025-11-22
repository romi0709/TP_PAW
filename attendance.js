// attendance.js
// All logic: validation, add student, toggle, recalc, colors, save/load, report, jQuery interactions.

(function ($) {
    // Column index mapping
    // 0: ID, 1: Last, 2: First, 3-8: S1..S6, 9-14: P1..P6, 15: Absences, 16: Participation, 17: Message, 18: Delete

    const STORAGE_KEY = "attendance_full_data_v1";
    let reportChart = null;

    $(function () {
        // Load saved table (if any) and attach events
        loadTableFromStorage();
        reattachEvents();
        recalcAllRows();

        // Form submit
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

            // Confirmation message
            $("#successMessage").text("Student successfully added!").show().fadeIn(200).delay(1500).fadeOut(800);

            // reset form
            this.reset();
        });

        // Show Report
        $("#showReportBtn").on("click", function () {
            generateReport();
        });

        // Highlight excellent students (< 3 abs)
        $("#highlightBtn").on("click", function () {
            $("#attendanceTable tbody tr").each(function () {
                const tr = $(this);
                const abs = countAbsencesInRow(tr);
                if (abs < 3) {
                    tr.addClass("excellent");
                    // simple animation: fade out/in
                    tr.fadeOut(180).fadeIn(180);
                }
            });
        });

        // Reset colors
        $("#resetBtn").on("click", function () {
            $("#attendanceTable tbody tr").removeClass("excellent");
            // clear inline highlights caused by hover (if any)
            $("#attendanceTable tbody tr").removeClass("rowHover");
        });

        // Clear saved data
        $("#clearStorageBtn").on("click", function () {
            if (confirm("Clear saved attendance data? This cannot be undone.")) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        });

        // Delegated hover (row highlight) using mouseenter/leave
        $("#attendanceTable tbody").on("mouseenter", "tr", function () { $(this).addClass("rowHover"); });
        $("#attendanceTable tbody").on("mouseleave", "tr", function () { $(this).removeClass("rowHover"); });

        // Delegated row click to show student info (ignore clicks on clickable cells and delete button)
        $("#attendanceTable tbody").on("click", "tr", function (e) {
            const $target = $(e.target);

            // if clicked a clickable cell (attendance/participation) or delete button, do not show the info alert here
            if ($target.hasClass("clickable") || $target.hasClass("deleteBtn") || $target.parent().hasClass("deleteBtn")) {
                return;
            }

            const tds = $(this).children("td");
            const last = tds.eq(1).text().trim();
            const first = tds.eq(2).text().trim();
            const abs = countAbsencesInRow($(this));

            alert("Student: " + first + " " + last + "\nAbsences: " + abs);
        });

        // Delegated click on attendance/participation cells toggles ✓
        $("#attendanceTable tbody").on("click", "td.clickable", function (e) {
            e.stopPropagation(); // prevent row click
            const td = $(this);
            td.text(td.text().trim() === "✓" ? "" : "✓");
            const row = td.closest("tr");
            updateRow(row);
            saveTableToStorage();
        });

        // Delegated delete button
        $("#attendanceTable tbody").on("click", ".deleteBtn", function (e) {
            e.stopPropagation();
            if (confirm("Delete this student?")) {
                $(this).closest("tr").remove();
                saveTableToStorage();
                recalcAllRows();
            }
        });
    });

    // ---------------- UTILITIES ----------------

    function clearFormErrors() {
        $("#idError,#lastError,#firstError,#emailError").text("");
    }

    function addStudentRow(id, last, first) {
        // create row with proper number of cells and classes
        const $tr = $("<tr></tr>");

        // ID / Last / First
        $tr.append($("<td></td>").text(id));
        $tr.append($("<td></td>").text(last));
        $tr.append($("<td></td>").text(first));

        // Attendance S1..S6 (cells 3..8)
        for (let i = 0; i < 6; i++) {
            $tr.append($("<td></td>").addClass("clickable"));
        }

        // Participation P1..P6 (cells 9..14)
        for (let i = 0; i < 6; i++) {
            $tr.append($("<td></td>").addClass("clickable"));
        }

        // Absences cell
        $tr.append($("<td></td>"));

        // Participation count cell
        $tr.append($("<td></td>"));

        // Message cell
        $tr.append($("<td></td>"));

        // Delete button cell
        $tr.append($("<td></td>").append($("<button></button>").addClass("deleteBtn").text("X")));

        $("#attendanceTable tbody").append($tr);
        updateRow($tr);
    }

    function updateRow($tr) {
        // remove color classes
        $tr.removeClass("greenRow yellowRow redRow");

        // get tds
        const tds = $tr.children("td");

        let absences = 0;
        for (let i = 3; i <= 8; i++) {
            if (tds.eq(i).text().trim() === "") absences++;
        }

        let participationCount = 0;
        for (let i = 9; i <= 14; i++) {
            if (tds.eq(i).text().trim() === "✓") participationCount++;
        }

        // set counts
        tds.eq(15).text(absences);
        tds.eq(16).text(participationCount);

        // set message and color
        let message = "";
        if (absences >= 5) {
            $tr.addClass("redRow");
            message = "Excluded – too many absences – You need to participate more";
        } else if (absences >= 3) {
            $tr.addClass("yellowRow");
            message = "Warning – attendance low – You need to participate more";
        } else {
            $tr.addClass("greenRow");
            message = (participationCount >= 4)
                ? "Good attendance – Excellent participation"
                : "Good attendance – Try to participate more";
        }

        tds.eq(17).text(message);
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
        // save tbody html
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
        // nothing to re-bind explicitly because delegated handlers are used.
        // But ensure every clickable td has class and delete buttons exist (when loaded from HTML).
        $("#attendanceTable tbody tr").each(function () {
            // ensure classes on TDs when loaded
            const tds = $(this).children("td");
            // ensure attendance/participation cells have clickable class when saved HTML didn't preserve classes
            for (let i = 3; i <= 14; i++) {
                tds.eq(i).addClass("clickable");
            }
            // ensure delete button exists
            if (tds.length < 19) {
                // If saved data didn't include delete, append one
                $(this).append($("<td></td>").append($("<button></button>").addClass("deleteBtn").text("X")));
            }
        });
    }

    // ---------------- Report ----------------

    function generateReport() {
        const rows = $("#attendanceTable tbody tr");
        const total = rows.length;
        let presentCount = 0;        // students with at least one attendance ✓
        let participatingCount = 0;  // students with at least one participation ✓

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
                scales: {
                    y: { beginAtZero: true, precision: 0 }
                }
            }
        });
    }

})(jQuery);
document.getElementById("darkModeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
});
// ─────────────────────────────────────────────
// OPEN/CLOSE COLOR PANEL
// ─────────────────────────────────────────────
const panel = document.getElementById("colorPanel");
document.getElementById("colorPickerBtn").addEventListener("click", () => {
    panel.classList.toggle("hidden");
});

// ─────────────────────────────────────────────
// APPLY COLORS LIVE
// ─────────────────────────────────────────────
function applyColors() {
    document.documentElement.style.setProperty("--primary", localStorage.getItem("primary") || "#6c8ced");
    document.documentElement.style.setProperty("--bg", localStorage.getItem("bg") || "#eef3ff");
    document.documentElement.style.setProperty("--card", localStorage.getItem("card") || "rgba(255,255,255,0.65)");
}

// Apply saved theme on startup
applyColors();

// ─────────────────────────────────────────────
// SAVE COLORS
// ─────────────────────────────────────────────
document.getElementById("saveColors").addEventListener("click", () => {
    const primary = document.getElementById("primaryColor").value;
    const bg = document.getElementById("bgColor").value;
    const card = document.getElementById("cardColor").value;

    localStorage.setItem("primary", primary);
    localStorage.setItem("bg", bg);
    localStorage.setItem("card", card);

    applyColors();

    alert("Theme updated successfully!");
});
// ─────────────────────────────────────────────
// PRESET THEME BUTTONS
// ─────────────────────────────────────────────
document.querySelectorAll(".preset").forEach(btn => {
    btn.addEventListener("click", () => {
        const primary = btn.dataset.primary;
        const bg = btn.dataset.bg;
        const card = btn.dataset.card;

        localStorage.setItem("primary", primary);
        localStorage.setItem("bg", bg);
        localStorage.setItem("card", card);

        applyColors(); // refresh theme

        alert("Preset theme applied!");
    });
});
$("#searchInput").on("keyup", function () {
    const value = $(this).val().toLowerCase();

    $("#attendanceTable tbody tr").filter(function () {
        const nameText = $(this).text().toLowerCase();
        $(this).toggle(nameText.indexOf(value) > -1);
    });
});


$("#sortAbsences").on("click", function () {

    let rows = $("#attendanceTable tbody tr").get();

    rows.sort(function (a, b) {
        let absA = parseInt($(a).find(".abs-count").text());
        let absB = parseInt($(b).find(".abs-count").text());
        return absA - absB; // ASCENDING
    });

    $.each(rows, function (index, row) {
        $("#attendanceTable tbody").append(row);
    });

    $("#sortMessage").text("Currently sorted by absences (ascending)");
});
$("#sortParticipation").on("click", function () {

    let rows = $("#attendanceTable tbody tr").get();

    rows.sort(function (a, b) {
        let parA = parseInt($(a).find(".par-count").text());
        let parB = parseInt($(b).find(".par-count").text());
        return parB - parA; // DESCENDING
    });

    rows.forEach(row => $("#attendanceTable tbody").append(row));

    $("#sortMessage").text("Currently sorted by participation (descending)");
});
$("#exportPDF").click(function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Attendance Report", 14, 10);

    doc.autoTable({
        html: "#attendanceTable",
        startY: 20
    });

    doc.save("attendance.pdf");
});
$("#exportExcel").click(function () {
    var table = document.getElementById("attendanceTable");

    var workbook = XLSX.utils.table_to_book(table, { sheet: "Attendance" });
    XLSX.writeFile(workbook, "attendance.xlsx");
});

