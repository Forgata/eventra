import app from "./app.js";
import { connectDB } from "./infrastructure/db/connect.js";
import "dotenv/config";

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI)
  throw new Error("MONGODB_URI is not defined in environment variables");
await connectDB(MONGODB_URI);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
