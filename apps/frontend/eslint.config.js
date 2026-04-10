import js from '@eslint/js';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFilePlugin from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

// 공통 규칙 묶음입니다.
// flat config에서는 파일별 블록에 rules를 직접 넣기 때문에,
// 여러 TS/TSX 파일에 공통으로 적용할 규칙을 한 곳에 모아둡니다.
const baseRules = {
  ...tsEslintPlugin.configs.recommended.rules,
  ...eslintConfigPrettier.rules,
  // TypeScript가 식별자 해석을 담당하므로 no-undef는 중복 경고가 나기 쉬워 비활성화합니다.
  'no-undef': 'off',
  // 초기 단계에서는 포맷 문제로 작업이 막히지 않도록 warning으로만 안내합니다.
  'prettier/prettier': 'warn',
  // React Hooks 필수 규칙입니다.
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  // Vite HMR과 충돌하기 쉬운 export 패턴을 가볍게 점검합니다.
  'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  // props 타입은 interface보다 type 사용을 권장합니다.
  '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
  // 컴포넌트는 선언문보다 화살표 함수 스타일로 통일합니다.
  'react/function-component-definition': [
    'warn',
    {
      namedComponents: 'arrow-function',
      unnamedComponents: 'arrow-function',
    },
  ],
  // 이벤트 핸들러 네이밍은 아직 강제하지 않고 팀 적응 후 도입할 수 있게 비워둡니다.
  // import는 외부 모듈 -> 내부 alias -> 상대 경로 순서를 권장합니다.
  'import/order': [
    'warn',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      pathGroups: [
        {
          pattern: '@/**',
          group: 'internal',
          position: 'before',
        },
      ],
      pathGroupsExcludedImportTypes: ['react'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    },
  ],
  // 인자가 너무 많은 함수는 객체 파라미터 등을 고민하도록 경고만 둡니다.
  'max-params': ['warn', 3],
  // 폴더명은 처음부터 소문자 kebab-case로 고정해두는 편이 나중에 덜 아픕니다.
  'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE' }],
};

export default [
  {
    // 빌드 산출물과 설정 파일 일부는 lint 대상에서 제외합니다.
    ignores: ['dist', '.eslintrc.cjs', 'vite.config.ts', 'commitlint.config.js'],
  },
  js.configs.recommended,
  {
    // 프론트 소스의 기본 검사 대상입니다.
    // TS parser, 브라우저 전역 객체, React 관련 플러그인을 여기서 연결합니다.
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      import: importPlugin,
      'check-file': checkFilePlugin,
      prettier: prettierPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: baseRules,
  },
  {
    // 우리 팀에서는 page도 React 컴포넌트의 한 종류로 보고 PascalCase를 사용합니다.
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/components/**/*.{ts,tsx}': 'PASCAL_CASE',
          'src/pages/**/*.{ts,tsx}': 'PASCAL_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
  {
    // custom hook 파일은 useSomething 형태를 고려해 camelCase를 사용합니다.
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/hooks/**/*.{ts,tsx}': 'CAMEL_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
  {
    // 위 예외에 속하지 않는 일반 TS/TSX 파일은 kebab-case를 사용합니다.
    // components/pages/hooks와 엔트리 파일은 역할이 명확해 별도 규칙으로 관리합니다.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/**/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/App.tsx',
      'src/main.tsx',
    ],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/**/*.{ts,tsx}': 'KEBAB_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
  {
    // 엔트리 파일은 생태계에서 관용적으로 많이 쓰는 이름을 예외로 허용합니다.
    files: ['src/App.tsx', 'src/main.tsx', 'src/vite-env.d.ts'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
];
