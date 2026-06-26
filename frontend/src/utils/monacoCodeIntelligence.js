const registeredMonacoInstances = new WeakSet()

const languageLabels = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  javascript: 'JavaScript',
}

const snippetDefinitions = {
  c: [
    ['main', 'Main function', 'int main() {\n    $0\n    return 0;\n}'],
    ['printf', 'Print formatted output', 'printf("$1");$0'],
    ['scanf', 'Read formatted input', 'scanf("$1", &$2);$0'],
    ['for', 'For loop', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}'],
    ['while', 'While loop', 'while (${1:condition}) {\n    $0\n}'],
    ['if', 'If statement', 'if (${1:condition}) {\n    $0\n}'],
    ['ifelse', 'If/else statement', 'if (${1:condition}) {\n    $2\n} else {\n    $0\n}'],
    ['struct', 'Struct declaration', 'struct ${1:Name} {\n    $0\n};'],
    ['boilerplate', 'C boilerplate', '#include <stdio.h>\n\nint main() {\n    $0\n    return 0;\n}'],
  ],
  cpp: [
    ['main', 'Main function', 'int main() {\n    $0\n    return 0;\n}'],
    ['cout', 'Print with cout', 'cout << $1 << endl;$0'],
    ['cin', 'Read with cin', 'cin >> $1;$0'],
    ['vector', 'Vector declaration', 'vector<${1:int}> ${2:items};$0'],
    ['for', 'For loop', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}'],
    ['foreach', 'Range-based for loop', 'for (auto ${1:item} : ${2:items}) {\n    $0\n}'],
    ['while', 'While loop', 'while (${1:condition}) {\n    $0\n}'],
    ['if', 'If statement', 'if (${1:condition}) {\n    $0\n}'],
    ['class', 'Class declaration', 'class ${1:Name} {\npublic:\n    ${1:Name}() = default;\n\nprivate:\n    $0\n};'],
    ['boilerplate', 'C++ boilerplate', '#include <iostream>\nusing namespace std;\n\nint main() {\n    $0\n    return 0;\n}'],
  ],
  java: [
    ['sout', 'Print to standard output', 'System.out.println($1);$0'],
    ['serr', 'Print to standard error', 'System.err.println($1);$0'],
    ['psvm', 'Main method', 'public static void main(String[] args) {\n    $0\n}'],
    ['main', 'Main method', 'public static void main(String[] args) {\n    $0\n}'],
    ['fori', 'Indexed for loop', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}'],
    ['foreach', 'Enhanced for loop', 'for (${1:String} ${2:item} : ${3:items}) {\n    $0\n}'],
    ['if', 'If statement', 'if (${1:condition}) {\n    $0\n}'],
    ['ifelse', 'If/else statement', 'if (${1:condition}) {\n    $2\n} else {\n    $0\n}'],
    ['try', 'Try/catch block', 'try {\n    $1\n} catch (${2:Exception} ${3:e}) {\n    $0\n}'],
    ['class', 'Class declaration', 'public class ${1:Main} {\n    $0\n}'],
    ['scanner', 'Scanner input', 'Scanner ${1:sc} = new Scanner(System.in);$0'],
    ['arraylist', 'ArrayList declaration', 'ArrayList<${1:String}> ${2:items} = new ArrayList<>();$0'],
    ['boilerplate', 'Java boilerplate', 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        $0\n    }\n}'],
  ],
  python: [
    ['print', 'Print output', 'print($1)$0'],
    ['main', 'Main guard', 'def main():\n    $1\n\n\nif __name__ == "__main__":\n    main()'],
    ['def', 'Function definition', 'def ${1:name}(${2:args}):\n    $0'],
    ['class', 'Class definition', 'class ${1:Name}:\n    def __init__(self${2:, args}):\n        $0'],
    ['for', 'For loop', 'for ${1:item} in ${2:items}:\n    $0'],
    ['range', 'Range loop', 'for ${1:i} in range(${2:n}):\n    $0'],
    ['while', 'While loop', 'while ${1:condition}:\n    $0'],
    ['if', 'If statement', 'if ${1:condition}:\n    $0'],
    ['ifelse', 'If/else statement', 'if ${1:condition}:\n    $2\nelse:\n    $0'],
    ['try', 'Try/except block', 'try:\n    $1\nexcept ${2:Exception} as ${3:e}:\n    $0'],
    ['listcomp', 'List comprehension', '[${1:expr} for ${2:item} in ${3:items}]$0'],
  ],
  javascript: [
    ['log', 'Console log', 'console.log($1);$0'],
    ['clg', 'Console log', 'console.log($1);$0'],
    ['fn', 'Function declaration', 'function ${1:name}(${2:params}) {\n  $0\n}'],
    ['afn', 'Arrow function', 'const ${1:name} = (${2:params}) => {\n  $0\n};'],
    ['for', 'For loop', 'for (let ${1:i} = 0; ${1:i} < ${2:items.length}; ${1:i}++) {\n  $0\n}'],
    ['foreach', 'forEach loop', '${1:items}.forEach((${2:item}) => {\n  $0\n});'],
    ['if', 'If statement', 'if (${1:condition}) {\n  $0\n}'],
    ['ifelse', 'If/else statement', 'if (${1:condition}) {\n  $2\n} else {\n  $0\n}'],
    ['try', 'Try/catch block', 'try {\n  $1\n} catch (${2:error}) {\n  $0\n}'],
    ['async', 'Async function', 'const ${1:name} = async (${2:params}) => {\n  $0\n};'],
    ['promise', 'Promise', 'new Promise((resolve, reject) => {\n  $0\n});'],
  ],
}

const keywordDefinitions = {
  c: [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else',
    'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return',
    'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned',
    'void', 'volatile', 'while', 'printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy',
  ],
  cpp: [
    'alignas', 'auto', 'bool', 'break', 'case', 'catch', 'class', 'const', 'constexpr',
    'continue', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'false', 'float',
    'for', 'friend', 'if', 'inline', 'int', 'long', 'namespace', 'new', 'nullptr', 'private',
    'protected', 'public', 'return', 'short', 'sizeof', 'static', 'struct', 'switch',
    'template', 'this', 'throw', 'true', 'try', 'typedef', 'typename', 'using', 'vector',
    'string', 'map', 'set', 'queue', 'stack', 'cout', 'cin', 'endl', 'sort',
  ],
  java: [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
    'finally', 'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface',
    'long', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static',
    'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
    'try', 'void', 'volatile', 'while', 'String', 'System', 'Scanner', 'ArrayList', 'HashMap',
    'HashSet', 'Arrays', 'Collections', 'Math',
  ],
  python: [
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
    'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'True', 'try', 'while', 'with', 'yield', 'print', 'input', 'len', 'range', 'enumerate',
    'zip', 'map', 'filter', 'sum', 'min', 'max', 'sorted', 'list', 'dict', 'set', 'tuple',
  ],
  javascript: [
    'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for',
    'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super',
    'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while',
    'yield', 'console', 'document', 'window', 'Array', 'Object', 'Promise', 'Map', 'Set',
  ],
}

const getRange = (model, position) => {
  const word = model.getWordUntilPosition(position)

  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  }
}

const createSuggestionProvider = (monaco, language) => ({
  triggerCharacters: ['.', ':', '<', '"', "'", '#'],
  provideCompletionItems: (model, position) => {
    const range = getRange(model, position)
    const snippets = (snippetDefinitions[language] || []).map(([label, detail, insertText], index) => ({
      label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail,
      documentation: `${languageLabels[language]} snippet`,
      range,
      sortText: `000${index}`,
    }))
    const keywords = (keywordDefinitions[language] || []).map((keyword, index) => ({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: keyword,
      detail: `${languageLabels[language]} keyword/API`,
      range,
      sortText: `100${index}`,
    }))

    return {
      suggestions: [...snippets, ...keywords],
    }
  },
})

export const registerCodeEditorCompletions = (monaco) => {
  if (!monaco || registeredMonacoInstances.has(monaco)) {
    return
  }

  registeredMonacoInstances.add(monaco)

  Object.keys(snippetDefinitions).forEach((language) => {
    monaco.languages.registerCompletionItemProvider(language, createSuggestionProvider(monaco, language))
  })

  monaco.languages.typescript?.javascriptDefaults?.setCompilerOptions?.({
    allowNonTsExtensions: true,
    checkJs: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  })
}

export const codeEditorIntelliSenseOptions = {
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: 'matchingDocuments',
  snippetSuggestions: 'top',
  parameterHints: { enabled: true },
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  formatOnPaste: true,
  formatOnType: true,
  suggest: {
    showSnippets: true,
    showKeywords: true,
    showWords: true,
    localityBonus: true,
    preview: true,
    selectionMode: 'whenQuickSuggestion',
  },
}
