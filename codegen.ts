import { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config();

const config: CodegenConfig = {
  generates: {
    "./src/data/generated/cms/": {
      documents: ["src/data/cms/**/*"],
      // schema: "http://localhost:3001/api/graphql", // TODO: set
      schema: process.env.CMS_URL!,
      preset: "client",
      plugins: [],
      config: {
        documentMode: "string",
      },
    },
  },
};

export default config;
