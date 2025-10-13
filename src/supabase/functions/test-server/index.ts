import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["*"],
  allowMethods: ["*"],
}));

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "ACWhisk Test Server"
  });
});

app.get("/test", (c) => {
  return c.json({ 
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  });
});

Deno.serve(app.fetch);