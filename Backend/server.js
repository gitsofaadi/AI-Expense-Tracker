const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve your frontend
app.use(express.static(path.join(__dirname, "../Frontend")));

/*
====================================================
GEMINI AI
====================================================
*/

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/*
====================================================
MOCK DATABASE
====================================================
*/

let users = [];
let expenses = [];

/*
====================================================
HELPER FUNCTIONS
====================================================
*/

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 8);
}

function getUserFromRequest(req) {
    return req.headers.authorization;
}

/*
====================================================
HEALTH CHECK
====================================================
*/

app.get("/", (req, res) => {
    res.json({
        message: "AI Expense Tracker API is running"
    });
});

/*
====================================================
AUTHENTICATION
====================================================
*/

/*
SIGNUP / LOGIN

POST /api/auth

Body:

{
    "username": "sweety",
    "password": "1234",
    "action": "signup"
}
*/

app.post("/api/auth", (req, res) => {

    const { username, password, action } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username and password are required"
        });
    }

    /*
    SIGNUP
    */

    if (action === "signup") {

        const existingUser = users.find(
            user => user.username === username
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username already exists"
            });
        }

        const newUser = {
            id: generateId(),
            username,
            password
        };

        users.push(newUser);

        return res.json({
            success: true,
            message: "Account created successfully"
        });
    }

    /*
    LOGIN
    */

    if (action === "login") {

        const user = users.find(
            user =>
                user.username === username &&
                user.password === password
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        return res.json({
            success: true,
            token: user.username,
            username: user.username
        });
    }

    return res.status(400).json({
        success: false,
        message: "Invalid action"
    });
});

/*
====================================================
GET EXPENSES
====================================================

GET /api/expenses
*/

app.get("/api/expenses", (req, res) => {

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const userExpenses = expenses.filter(
        expense => expense.user === user
    );

    res.json(userExpenses);
});

/*
====================================================
ADD EXPENSE
====================================================

POST /api/expenses
*/

app.post("/api/expenses", async (req, res) => {

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const {
        description,
        amount
    } = req.body;

    if (!description || !amount) {
        return res.status(400).json({
            message: "Description and amount are required"
        });
    }

    let category = "Miscellaneous";

    /*
    AI CATEGORY DETECTION
    */

    try {

        const prompt = `
You are an expense categorization assistant.

Categorize the following expense into exactly ONE category.

Allowed categories:
Food
Transport
Shopping
Entertainment
Utilities
Health
Education
Travel
Bills
Other

Expense:
"${description}"

Return ONLY the category name.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        category = response.text.trim();

        /*
        Make sure category is valid
        */

        const validCategories = [
            "Food",
            "Transport",
            "Shopping",
            "Entertainment",
            "Utilities",
            "Health",
            "Education",
            "Travel",
            "Bills",
            "Other"
        ];

        if (!validCategories.includes(category)) {
            category = "Other";
        }

    } catch (error) {

        console.error("AI categorization error:", error);

        category = "Other";
    }

    /*
    CREATE EXPENSE
    */

    const newExpense = {
        id: generateId(),
        user,
        description,
        amount: Number(amount),
        category,
        date: new Date().toISOString()
    };

    expenses.push(newExpense);

    res.status(201).json(newExpense);
});

/*
====================================================
DELETE EXPENSE
====================================================

DELETE /api/expenses/:id
*/

app.delete("/api/expenses/:id", (req, res) => {

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const expenseIndex = expenses.findIndex(
        expense =>
            expense.id === req.params.id &&
            expense.user === user
    );

    if (expenseIndex === -1) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }

    expenses.splice(expenseIndex, 1);

    res.json({
        success: true,
        message: "Expense deleted successfully"
    });
});

/*
====================================================
AI FINANCIAL ANALYSIS
====================================================

GET /api/analysis
*/

app.get("/api/analysis", async (req, res) => {

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const userExpenses = expenses.filter(
        expense => expense.user === user
    );

    if (userExpenses.length === 0) {

        return res.json({
            analysis: "You don't have enough expense data yet. Add some expenses to receive AI-powered financial insights."
        });
    }

    /*
    Prepare data for Gemini
    */

    const expenseData = userExpenses.map(expense => ({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
    }));

    try {

        const prompt = `
You are a personal finance analysis assistant.

Analyze the following expense data:

${JSON.stringify(expenseData, null, 2)}

Provide:

1. A short summary of the user's spending.
2. Their biggest spending category.
3. One spending habit you identify.
4. A prediction of their next month's spending trend.
5. Two practical suggestions to save money.

Keep the answer concise and easy to understand.

Do not claim certainty about future spending.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        res.json({
            analysis: response.text
        });

    } catch (error) {

        console.error("AI analysis error:", error);

        res.status(500).json({
            error: "AI analysis failed"
        });
    }
});

/*
====================================================
SERVER
====================================================
*/

app.listen(PORT, () => {

    console.log(
        `AI Expense Tracker backend running at http://localhost:${PORT}`
    );

});