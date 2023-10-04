// ProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import fetchProtect from "./services/fetchProtect";

type ProtectedElementProps = {
	children: React.ReactElement;
	needUsername: boolean;
};

const ProtectedElement = ({
	children,
	needUsername,
}: ProtectedElementProps) => {
	const [isLoading, setIsLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [username, setUsername] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;

	const checkAuthentication = async () => {
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "GET",
		};
		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/auth/checkAuthentication",
			requestOptions,
			navigate
		)
			.then((data) => {
				setIsAuthenticated(data.authenticated);
				setUsername(data.username);
				if (!data.authenticated && currentPath !== "/") {
					console.log("Redirecting to login page.");
					navigate("/?error=403");
				}
				if (
					needUsername &&
					!data.username &&
					currentPath !== "/register"
				) {
					console.log("Redirecting to register page.");
					navigate("/register");
				}
				if (data.username && currentPath !== "/app") {
					console.log("Redirecting to application page.");
					navigate("/app");
				}
			})
			.catch((error) => {
				console.error(
					"Error while verifying authentication:",
					error
				);
				navigate("/?error=403");
			})
			.finally(() => {
				console.log("End of the verification.");
				setIsLoading(false);
			});
	};

	useEffect(() => {
		console.log("Verifying authentication");
		checkAuthentication();
	}, [location]);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (!isAuthenticated || (needUsername && !username)) {
		return null;
	}

	return children;
};

export default ProtectedElement;
