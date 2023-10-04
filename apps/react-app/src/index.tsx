import { createRoot } from "react-dom/client";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LoginRedirect from "./pages/LoginRedirect";
import App from "./pages/App";
import reportWebVitals from "./reportWebVitals";
import "./assets/styles/index.css";
import ProtectedElement from "./ProtectedRoute";
import { StrictMode } from "react";
import TwoFAVerif from "./pages/TwoFAVerif";
import Pong from "./components/Pong";

const Root = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Login />} />
				<Route path="/LoginRedirect" element={<LoginRedirect />} />
				<Route
					path="/Register"
					element={
						<ProtectedElement needUsername={false}>
							<Register />
						</ProtectedElement>
					}
				/>
				<Route
					path="/App"
					element={
						<ProtectedElement needUsername={true}>
							<App />
						</ProtectedElement>
					}
				/>
				{/* Redirection a la racine si route inexistante  */}
				<Route path="*" element={<Navigate to="/" />} />{" "}
			</Routes>
		</Router>
	);
};

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(
		// <StrictMode>
		<Root />
		// </StrictMode>
	);
	reportWebVitals();
}
