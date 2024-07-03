// imports here for express and pg
const express = require("express");
const app = express();
const pg = require("pg");
const path = require("path");

// parse the body objects
app.use(express.json());

//log the requests as they come in - only in development
app.use(require("morgan")("dev"));

// special error handling
app.use((error, req, res, next) => {
  res.status(res.status || 500).send({ error: error });
});

// Environment variable
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_db"
);

const port = process.env.PORT || 3000;

// static routes here (you only need these for deployment)

// app routes here

// get all department
app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM department ORDER BY name DESC;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// get all employee
app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM employee ORDER BY created_at DESC;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// create a new employee
app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = `INSERT INTO employee(name, department_id) 
         VALUES($1, $2)
         RETURNING *
         `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);

    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// update an employee
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `UPDATE employee
        SET name = $1, department_id = $2, updated_at=now()
         WHERE  id = $3;
         `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// delete an employee
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `DELETE from employee
         WHERE  id = $1;
         `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// create your init function

const init = async () => {
  await client.connect();

  let SQL = `
         DROP TABLE IF EXISTS employee;
         DROP TABLE IF EXISTS department;

         CREATE TABLE department(id SERIAL PRIMARY KEY, 
           created_at TIMESTAMP DEFAULT now(),
           updated_at TIMESTAMP DEFAULT now(),
           name VARCHAR(255) NOT NULL);

         CREATE TABLE employee(id SERIAL PRIMARY KEY, 
           created_at TIMESTAMP DEFAULT now(),
           updated_at TIMESTAMP DEFAULT now(),
           name VARCHAR(255) NOT NULL,
           department_id INTEGER REFERENCES department(id) NOT NULL);
       `;

  await client.query(SQL);
  console.log("table created");

  SQL = `
        INSERT INTO department(name) VALUES('Annuals');
        INSERT INTO department(name) VALUES('Perennials');
        INSERT INTO department(name) VALUES('Cashier');
        INSERT INTO employee(name, department_id) VALUES('Betty', (SELECT id FROM department WHERE name='Annuals'));
        INSERT INTO employee(name, department_id) VALUES('Marge', (SELECT id FROM department WHERE name='Perennials'));
        INSERT INTO employee(name, department_id) VALUES('Leo', (SELECT id FROM department WHERE name='Cashier'));
        INSERT INTO employee(name, department_id) VALUES('George', (SELECT id FROM department WHERE name='Cashier'));
        INSERT INTO employee(name, department_id) VALUES('Gertrude', (SELECT id FROM department WHERE name='Annuals'));
       `;

  await client.query(SQL);
  console.log("data seeded");

  app.listen(port, () => console.log(`listening on port ${port}`));
};

// init function invocation
init();
