import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Loader2,
  PanelRightClose,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react'

const VERDICT_STYLES = {
  idle: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  running: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  passed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
  error: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  done: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const normalizeOutput = (value) => String(value || '')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.replace(/\s+$/, ''))
  .join('\n')
  .replace(/\n+$/, '')

const getTestCaseVerdict = (testCase, result) => {
  if (!result) {
    return { key: 'idle', label: 'Not run' }
  }

  if (result.status === 'running') {
    return { key: 'running', label: 'Running' }
  }

  if (result.timedOut) {
    return { key: 'error', label: 'Timed out' }
  }

  if (result.exitCode !== 0) {
    return { key: 'error', label: `Runtime error (exit ${result.exitCode})` }
  }

  if (!String(testCase.expectedOutput || '').trim()) {
    return { key: 'done', label: 'Completed' }
  }

  return normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput)
    ? { key: 'passed', label: 'Passed' }
    : { key: 'failed', label: 'Wrong output' }
}

const TestCaseCard = ({
  index,
  isExpanded,
  isRunning,
  onDelete,
  onRun,
  onToggle,
  onUpdate,
  result,
  testCase,
}) => {
  const verdict = getTestCaseVerdict(testCase, result)
  const hasOutput = Boolean(result) && result.status !== 'running'

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={isExpanded ? 'Collapse test case' : 'Expand test case'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200">
            Test {index + 1}
          </span>
          <span className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${VERDICT_STYLES[verdict.key]}`}>
            {verdict.label}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {hasOutput ? (
            <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {result.durationMs}ms
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            title="Run this test case"
            aria-label="Run this test case"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete this test case"
            aria-label="Delete this test case"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-2 px-2 py-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Input
            </label>
            <textarea
              value={testCase.input}
              onChange={(event) => onUpdate({ input: event.target.value })}
              rows={3}
              spellCheck={false}
              placeholder="Type what you would type in the terminal"
              className="mt-1 w-full resize-y rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Expected output <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={testCase.expectedOutput}
              onChange={(event) => onUpdate({ expectedOutput: event.target.value })}
              rows={2}
              spellCheck={false}
              placeholder="Leave empty to only view the output"
              className="mt-1 w-full resize-y rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output
            </label>
            <pre
              className={`mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border px-2 py-1.5 font-mono text-xs text-slate-100 ${
                verdict.key === 'failed'
                  ? 'border-rose-500/60 bg-slate-950'
                  : verdict.key === 'passed'
                    ? 'border-emerald-500/60 bg-slate-950'
                    : 'border-slate-800 bg-slate-950'
              }`}
            >
              {result?.status === 'running' ? (
                <span className="text-slate-500">Running...</span>
              ) : hasOutput ? (
                result.stdout || <span className="text-slate-500">No output</span>
              ) : (
                <span className="text-slate-500">Run this test case to see the output</span>
              )}
            </pre>
          </div>

          {hasOutput && result.stderr ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                Errors
              </label>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-rose-500/40 bg-slate-950 px-2 py-1.5 font-mono text-xs text-rose-300">
                {result.stderr}
              </pre>
            </div>
          ) : null}

          {hasOutput && result.truncated ? (
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Output was too long and has been trimmed.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

const IDETestCases = ({
  batchError,
  hasActiveFile,
  isCollapsed,
  isCompiling,
  isDraggingWidth,
  isRunning,
  maxTestCases,
  onAddTestCase,
  onClearBatchError,
  onDeleteTestCase,
  onRunAllTestCases,
  onRunTestCase,
  onStartResize,
  onStopTestCases,
  onUpdateTestCase,
  results,
  saveError,
  setIsCollapsed,
  testCases,
  width,
}) => {
  const [collapsedTestCaseIds, setCollapsedTestCaseIds] = useState(() => new Set())

  const summary = useMemo(() => (
    testCases.reduce((counts, testCase) => {
      const verdictKey = getTestCaseVerdict(testCase, results[testCase.id]).key

      if (verdictKey === 'passed') {
        return { ...counts, passed: counts.passed + 1 }
      }

      if (verdictKey === 'failed' || verdictKey === 'error') {
        return { ...counts, failed: counts.failed + 1 }
      }

      return counts
    }, { passed: 0, failed: 0 })
  ), [results, testCases])

  const toggleTestCase = (testCaseId) => {
    setCollapsedTestCaseIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(testCaseId)) {
        nextIds.delete(testCaseId)
      } else {
        nextIds.add(testCaseId)
      }

      return nextIds
    })
  }

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        title="Open test cases"
        aria-label="Open test cases"
        className="flex w-11 shrink-0 flex-col items-center gap-3 border-l border-slate-200 bg-white py-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
      >
        <FlaskConical className="h-5 w-5" />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl' }}
        >
          Test Cases
        </span>
        {testCases.length ? (
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {testCases.length}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <>
      <div
        onMouseDown={onStartResize}
        className={`w-1 shrink-0 cursor-col-resize transition ${
          isDraggingWidth ? 'bg-blue-600' : 'bg-slate-200 hover:bg-blue-500 dark:bg-slate-800'
        }`}
      />

      <aside
        data-tour="ide-testcases"
        style={{ width: `${width}px` }}
        className="flex min-h-0 shrink-0 flex-col border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0 text-blue-500" />
            <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Test Cases
            </p>
            {summary.passed || summary.failed ? (
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">{summary.passed} passed</span>
                <span className="text-rose-600 dark:text-rose-400">{summary.failed} failed</span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse test cases"
            aria-label="Collapse test cases"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          {isRunning ? (
            <button
              type="button"
              onClick={onStopTestCases}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 active:scale-95"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onRunAllTestCases}
              disabled={!hasActiveFile || !testCases.length}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-700"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              Run All
            </button>
          )}

          <button
            type="button"
            onClick={onAddTestCase}
            disabled={!hasActiveFile || testCases.length >= maxTestCases}
            title={testCases.length >= maxTestCases ? `Limit of ${maxTestCases} test cases reached` : 'Add a test case'}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {isCompiling ? (
          <p className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Compiling...
          </p>
        ) : null}

        {batchError ? (
          <div className="flex shrink-0 items-start gap-2 border-b border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <pre className="max-h-32 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              {batchError}
            </pre>
            <button
              type="button"
              onClick={onClearBatchError}
              title="Dismiss"
              aria-label="Dismiss error"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-rose-500 transition hover:bg-rose-100 dark:hover:bg-rose-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {saveError ? (
          <p className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {saveError}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {!hasActiveFile ? (
            <div className="mt-6 text-center">
              <FlaskConical className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">No file selected</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Open a code file to build its test cases.
              </p>
            </div>
          ) : testCases.length ? (
            testCases.map((testCase, index) => (
              <TestCaseCard
                key={testCase.id}
                index={index}
                isExpanded={!collapsedTestCaseIds.has(testCase.id)}
                isRunning={isRunning}
                onDelete={() => onDeleteTestCase(testCase.id)}
                onRun={() => onRunTestCase(testCase.id)}
                onToggle={() => toggleTestCase(testCase.id)}
                onUpdate={(changes) => onUpdateTestCase(testCase.id, changes)}
                result={results[testCase.id]}
                testCase={testCase}
              />
            ))
          ) : (
            <div className="mt-6 text-center">
              <FlaskConical className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">No test cases yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a test case with the input your program reads from the terminal.
              </p>
              <button
                type="button"
                onClick={onAddTestCase}
                className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add test case
              </button>
            </div>
          )}
        </div>

        {hasActiveFile && testCases.length ? (
          <p className="flex shrink-0 items-center gap-1.5 border-t border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <Check className="h-3 w-3" />
            Test cases are saved with this file
          </p>
        ) : null}
      </aside>
    </>
  )
}

export default IDETestCases
