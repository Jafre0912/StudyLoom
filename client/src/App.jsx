import AppRoutes from "./routes/AppRoutes.jsx";
import MyClassRoutes from "./pages/myclass/MyClassRoutes.jsx";
import { IS_MYCLASS_HOST } from "./pages/myclass/base.js";

export default function App() {
  return IS_MYCLASS_HOST ? <MyClassRoutes /> : <AppRoutes />;
}