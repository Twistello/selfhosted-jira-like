import ts from 'typescript-eslint';
export default ts.config({ignores:['dist/**','node_modules/**','.runtime/**']},...ts.configs.recommended,{files:['**/*.ts','**/*.tsx'],rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}});
