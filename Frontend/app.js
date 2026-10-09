const API_URL = "/api";
let currentUser = localStorage.getItem("token");

let chartInstance = null;


/* =========================================
   INITIALIZE APPLICATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (currentUser) {

        showApp();

        fetchExpenses();

    } else {

        showAuth();

    }

});


/* =========================================
   VIEW MANAGEMENT
========================================= */

function showAuth() {

    document
        .getElementById("auth-section")
        .classList.remove("hidden");

    document
        .getElementById("app-section")
        .classList.add("hidden");
}


function showApp() {

    document
        .getElementById("auth-section")
        .classList.add("hidden");

    document
        .getElementById("app-section")
        .classList.remove("hidden");

    document
        .getElementById("welcome-user")
        .innerText = currentUser;
}


/* =========================================
   AUTHENTICATION
========================================= */

async function authenticate(action) {

    const username =
        document
            .getElementById("username")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value
            .trim();

    const message =
        document.getElementById("auth-message");


    if (!username || !password) {

        message.innerText =
            "Please enter username and password.";

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/auth`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username,
                    password,
                    action
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.innerText =
                data.message || "Authentication failed.";

            return;
        }


        /*
        SIGNUP
        */

        if (action === "signup") {

            message.style.color = "#16a34a";

            message.innerText =
                "Account created! You can now login.";

            document
                .getElementById("password")
                .value = "";

            return;
        }


        /*
        LOGIN
        */

        if (data.token) {

            currentUser = data.token;

            localStorage.setItem(
                "token",
                currentUser
            );

            message.innerText = "";

            showApp();

            fetchExpenses();
        }

    } catch (error) {

        console.error(error);

        message.style.color = "#dc2626";

        message.innerText =
            "Unable to connect to server.";
    }

}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.removeItem("token");

    currentUser = null;

    if (chartInstance) {

        chartInstance.destroy();

        chartInstance = null;
    }

    showAuth();

}


/* =========================================
   FETCH EXPENSES
========================================= */

async function fetchExpenses() {

    try {

        const response = await fetch(
            `${API_URL}/expenses`,
            {
                headers: {
                    Authorization: currentUser
                }
            }
        );


        if (!response.ok) {

            if (response.status === 401) {

                logout();

            }

            return;
        }


        const expenses =
            await response.json();


        renderDashboard(expenses);

    } catch (error) {

        console.error(
            "Failed to fetch expenses:",
            error
        );
    }

}


/* =========================================
   ADD EXPENSE
========================================= */

async function addExpense() {

    const description =
        document
            .getElementById("desc")
            .value
            .trim();

    const amount =
        document
            .getElementById("amount")
            .value;

    const message =
        document.getElementById(
            "expense-message"
        );


    if (!description || !amount) {

        message.innerText =
            "Please enter description and amount.";

        return;
    }


    if (Number(amount) <= 0) {

        message.innerText =
            "Amount must be greater than zero.";

        return;
    }


    message.innerText =
        "✨ AI is categorizing your expense...";


    try {

        const response = await fetch(
            `${API_URL}/expenses`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        currentUser
                },

                body: JSON.stringify({
                    description,
                    amount
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            message.innerText =
                data.message ||
                "Failed to add expense.";

            return;
        }


        /*
        Clear inputs
        */

        document
            .getElementById("desc")
            .value = "";

        document
            .getElementById("amount")
            .value = "";


        message.innerText =
            `Expense added as "${data.category}".`;


        fetchExpenses();


    } catch (error) {

        console.error(error);

        message.innerText =
            "Unable to connect to server.";
    }

}


/* =========================================
   DELETE EXPENSE
========================================= */

async function deleteExpense(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this expense?"
        );


    if (!confirmDelete) {

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/expenses/${id}`,
            {
                method: "DELETE",

                headers: {
                    Authorization: currentUser
                }
            }
        );


        if (!response.ok) {

            alert(
                "Unable to delete expense."
            );

            return;
        }


        fetchExpenses();

    } catch (error) {

        console.error(error);

        alert(
            "Server connection failed."
        );
    }

}


/* =========================================
   RENDER DASHBOARD
========================================= */

function renderDashboard(expenses) {

    const list =
        document.getElementById(
            "expense-list"
        );


    /*
    Empty state
    */

    if (expenses.length === 0) {

        list.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    🧾
                </div>

                <p>
                    No expenses yet.
                </p>

            </div>
        `;

    } else {

        list.innerHTML = "";

    }


    let total = 0;

    const categories = {};


    /*
    Render expenses
    */

    expenses.forEach(expense => {

        total += Number(expense.amount);


        categories[expense.category] =
            (categories[expense.category] || 0)
            + Number(expense.amount);


        const item =
            document.createElement("div");


        item.className =
            "expense-item";


        item.innerHTML = `

            <div class="expense-info">

                <div class="expense-icon">
                    ${getCategoryIcon(expense.category)}
                </div>

                <div>

                    <div class="expense-name">
                        ${escapeHTML(expense.description)}
                    </div>

                    <div class="expense-category">
                        ${escapeHTML(expense.category)}
                    </div>

                </div>

            </div>


            <div class="expense-right">

                <span class="expense-amount">
                    ₹${Number(expense.amount).toFixed(2)}
                </span>

                <button
                    class="delete-btn"
                    onclick="deleteExpense('${expense.id}')">

                    ✕

                </button>

            </div>

        `;


        list.appendChild(item);

    });


    /*
    Summary
    */

    const count =
        expenses.length;


    const average =
        count > 0
            ? total / count
            : 0;


    document.getElementById(
        "total-spent"
    ).innerText =
        total.toFixed(2);


    document.getElementById(
        "expense-count"
    ).innerText =
        count;


    document.getElementById(
        "average-expense"
    ).innerText =
        average.toFixed(2);


    /*
    Chart
    */

    renderChart(categories);

}


/* =========================================
   CATEGORY ICON
========================================= */

function getCategoryIcon(category) {

    const icons = {

        Food: "🍔",

        Transport: "🚗",

        Shopping: "🛍️",

        Entertainment: "🎬",

        Utilities: "💡",

        Health: "🏥",

        Education: "📚",

        Travel: "✈️",

        Bills: "🧾",

        Other: "💰"
    };


    return icons[category] || "💰";
}


/* =========================================
   CHART
========================================= */

function renderChart(data) {

    const canvas =
        document.getElementById(
            "expenseChart"
        );


    if (chartInstance) {

        chartInstance.destroy();

        chartInstance = null;
    }


    const labels =
        Object.keys(data);


    const values =
        Object.values(data);


    if (labels.length === 0) {

        return;
    }


    const ctx =
        canvas.getContext("2d");


    chartInstance =
        new Chart(
            ctx,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {
                            data: values,

                            backgroundColor: [
                                "#6366f1",
                                "#22c55e",
                                "#f59e0b",
                                "#ef4444",
                                "#06b6d4",
                                "#8b5cf6",
                                "#ec4899",
                                "#14b8a6",
                                "#f97316",
                                "#64748b"
                            ],

                            borderWidth: 0
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }
                }

            }
        );

}


/* =========================================
   AI FINANCIAL ANALYSIS
========================================= */

async function getAIInsights() {

    const button =
        document.getElementById(
            "analysis-btn"
        );

    const responseBox =
        document.getElementById(
            "ai-response"
        );


    button.disabled = true;

    button.innerText =
        "✨ Analyzing your spending...";


    responseBox.innerText =
        "AI is analyzing your expenses...";


    try {

        const response = await fetch(
            `${API_URL}/analysis`,
            {
                headers: {
                    Authorization:
                        currentUser
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            responseBox.innerText =
                data.error ||
                "Analysis failed.";

            return;
        }


        responseBox.innerText =
            data.analysis;


    } catch (error) {

        console.error(error);

        responseBox.innerText =
            "Unable to connect to the AI service.";

    } finally {

        button.disabled = false;

        button.innerText =
            "✨ Analyze My Spending";
    }

}


/* =========================================
   SECURITY HELPER
========================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}