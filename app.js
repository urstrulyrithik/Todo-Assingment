const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8000, () => {
      console.log("Server Running at http://localhost:/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const statusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const priorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const categoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const statusAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const statusAndCategoryProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.category !== undefined
  );
};

const priorityAndCategoryProperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const checkValidityForBody = (request, response, next) => {
  const { priority, status, category, dueDate } = request.body;
  const parsedDate = Date.parse(dueDate);
  const isValidDate = isValid(parsedDate);
  if (
    priority !== undefined &&
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    status !== undefined &&
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    category !== undefined &&
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (dueDate !== undefined && isValidDate === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const checkValidityForQuery = (request, response, next) => {
  console.log("Entered");
  const { priority, status, category, date } = request.query;

  if (
    priority !== undefined &&
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    status !== undefined &&
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    category !== undefined &&
    category !== "WORK" &&
    category !== "HOME" &&
    category &&
    "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (date !== undefined) {
    console.log("Else if entered");
    const parsedDate = new Date(date);
    const isDateValid = isValid(parsedDate);
    if (isDateValid === false) {
      response.status(400);
      response.send("Invalid Due Date");
    }
    next();
  } else {
    next();
  }
};

app.get("/todos/", checkValidityForQuery, async (request, Response) => {
  let getTodoQuery;
  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case statusProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and status="${status}";`;
      break;

    case priorityProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and priority="${priority}";`;
      break;

    case statusAndPriorityProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and priority="${priority}" and status="${status}";`;
      break;

    case statusAndCategoryProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and status="${status}" and category="${category}";`;
      break;
    case categoryProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and category="${category}";`;
      break;
    case priorityAndCategoryProperty(request.query):
      getTodoQuery = `select * from todo where todo="${search_q}" and category="${category}" and priority="${priority}";`;
      break;
    default:
      getTodoQuery = `select * from todo where todo LIKE "%${search_q}%"`;
  }
  console.log(getTodoQuery);

  const todosList = await db.all(getTodoQuery);
  Response.send(todosList);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `select * from todo where id=${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", checkValidityForQuery, async (request, response) => {
  console.log("Entered");
  const { date } = request.query;
  console.log(request.query);
  console.log(date);

  const getQuery = `select * from todo where due_date=${date}`;
  const todoList = await db.all(getQuery);
  response.send(todoList);
});

app.post("/todos/", checkValidityForBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const date = new Date(dueDate);
  const formattedDate = format(date, "yyyy-MM-dd");
  const postQuery = `insert into todo (id,todo,priority,status,category,due_date) 
  values(${id},"${todo}","${priority}","${status}","${category}",${formattedDate});`;
  await db.run(postQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", checkValidityForBody, async (request, response) => {
  let { todoId } = request.params;

  let updateColumn = "";
  const requestBody = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const prevTodoQuery = `select * from todo where id=${todoId};`;
  const prevTodo = await db.get(prevTodoQuery);

  const {
    status = prevTodo.status,
    priority = prevTodo.priority,
    todo = prevTodo.todo,
    dueDate = prevTodo.dueDate,
    category = prevTodo.category,
  } = request.body;

  const updateTodoQuery = `update todo set(status="${status}",priority="${priority}",todo="${todo}",category="${category}",due_date="${dueDate}");`;
  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `delete from todo where id=${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
