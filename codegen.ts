import { CHAIN_CONFIG } from "./src/config";
import { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config();

const config: CodegenConfig = {
  generates: {
    "./src/data/generated/gql/": {
      documents: [
        "src/**/*.{ts,tsx}",
        "!src/data/generated/**/*",
        "!src/data/ponder/**/*",
        "!src/data/cms/**/*",
      ],
      schema: `https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn`,
      preset: "client",
      plugins: [],
      config: {
        documentMode: "string",
        scalars: {
          BigDecimal: {
            input: "string",
            output: "string",
          },
          BigInt: {
            input: "string",
            output: "string",
          },
          Int8: {
            input: "any",
            output: "string",
          },
          Bytes: {
            input: "any",
            output: "string",
          },
        },
        mappers: {
          BigInt: "bigint",
        },
      },
    },
    "./src/data/generated/ponder/": {
      documents: ["src/data/ponder/**/*"],
      schema: CHAIN_CONFIG.ponderIndexerUrl,
      preset: "client",
      plugins: [],
      config: {
        documentMode: "string",
        scalars: {
          BigDecimal: {
            input: "string",
            output: "string",
          },
          BigInt: {
            input: "string",
            output: "string",
          },
          Int8: {
            input: "any",
            output: "string",
          },
          Bytes: {
            input: "any",
            output: "string",
          },
        },
        mappers: {
          BigInt: "bigint",
        },
        dedupeFragments: true,
      },
      presetConfig: {
        fragmentMasking: false, // HERE
      },
    },
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
