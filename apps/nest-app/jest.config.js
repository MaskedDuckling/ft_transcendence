module.exports = {
	roots: ["<rootDir>/src"],
	testMatch: ["**/*.spec.ts"],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	// reporters: [
	// 	[
	// 		"jest-junit",
	// 		{
	// 			outputDirectory: "./test-reports",
	// 			outputName: "./report.xml",
	// 		},
	// 	],
	// ],
};
