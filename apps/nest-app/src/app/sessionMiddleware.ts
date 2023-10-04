import session from "express-session";

export const sessionMiddleware = session({
	cookie: {
		secure: true,
		maxAge: 3600 * 1000,
	},
	secret: process.env.SESSION_SECRET || "secret",
	resave: false,
	saveUninitialized: false,
	rolling: true,
});
