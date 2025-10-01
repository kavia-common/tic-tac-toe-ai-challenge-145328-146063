import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';

/**
 * Ocean Professional Theme
 * - Blue & amber accents
 * - Minimalist, rounded corners, subtle shadows, gradients for depth
 */
const theme = {
  name: 'Ocean Professional',
  colors: {
    primary: '#2563EB', // Blue
    secondary: '#F59E0B', // Amber
    success: '#F59E0B',
    error: '#EF4444',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    subtleText: '#6B7280',
    divider: '#E5E7EB',
    shadow: 'rgba(0,0,0,0.08)',
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
  },
};

/**
 * Types and utilities
 */
type Player = 'X' | 'O';
type Cell = Player | null;
type Board = Cell[]; // length 9

const LINES = [
  [0, 1, 2], // rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // cols
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // diagonals
  [2, 4, 6],
];

// PUBLIC_INTERFACE
function checkWinner(board: Board): { winner: Player | 'Draw' | null; line: number[] | null } {
  /** Determine winner and winning line; or draw; or ongoing. */
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((c) => c !== null)) {
    return { winner: 'Draw', line: null };
  }
  return { winner: null, line: null };
}

/**
 * Simple AI:
 * 1) Win if possible
 * 2) Block opponent from winning
 * 3) Take center if free
 * 4) Take a corner if available
 * 5) Otherwise take any side
 */
// PUBLIC_INTERFACE
function computeAIMove(board: Board, ai: Player, human: Player): number | null {
  /** Compute next AI move index based on simple heuristics. Returns null if no move. */
  // Try winning
  for (const [a, b, c] of LINES) {
    const line = [a, b, c];
    const cells = line.map((i) => board[i]);
    if (cells.filter((x) => x === ai).length === 2 && cells.includes(null)) {
      return line[cells.indexOf(null)];
    }
  }
  // Try blocking
  for (const [a, b, c] of LINES) {
    const line = [a, b, c];
    const cells = line.map((i) => board[i]);
    if (cells.filter((x) => x === human).length === 2 && cells.includes(null)) {
      return line[cells.indexOf(null)];
    }
  }
  // Center
  if (board[4] === null) return 4;

  // Corners
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  // Sides
  const sides = [1, 3, 5, 7].filter((i) => board[i] === null);
  if (sides.length > 0) return sides[Math.floor(Math.random() * sides.length)];

  return null;
}

/**
 * Square component
 */
type SquareProps = {
  value: Cell;
  highlight?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const Square: React.FC<SquareProps> = ({ value, onPress, highlight = false, disabled = false }) => {
  const display = value ?? '';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !!value}
      android_ripple={{ color: theme.colors.divider }}
      style={({ pressed }) => [
        styles.square,
        {
          backgroundColor: theme.colors.surface,
          borderColor: highlight ? theme.colors.secondary : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: theme.colors.shadow,
        },
        Platform.select({
          ios: styles.iosShadow,
          android: styles.androidShadow,
          default: undefined,
        }),
      ]}
    >
      <Text
        style={[
          styles.squareText,
          {
            color:
              value === 'X'
                ? theme.colors.primary
                : value === 'O'
                ? theme.colors.secondary
                : theme.colors.text,
          },
        ]}
      >
        {display}
      </Text>
    </Pressable>
  );
};

/**
 * Board component
 */
type BoardProps = {
  board: Board;
  onMove: (index: number) => void;
  disabled?: boolean;
  winningLine?: number[] | null;
};

const BoardView: React.FC<BoardProps> = ({ board, onMove, disabled = false, winningLine }) => {
  const isHighlighted = (i: number) => winningLine?.includes(i) ?? false;

  return (
    <View style={styles.boardWrapper}>
      <View style={styles.boardGrid}>
        {board.map((cell, idx) => (
          <Square
            key={idx}
            value={cell}
            onPress={() => onMove(idx)}
            disabled={disabled}
            highlight={isHighlighted(idx)}
          />
        ))}
        {/* Board separators (styled as subtle rounded lines) */}
        <View style={[styles.separator, styles.sepH1]} />
        <View style={[styles.separator, styles.sepH2]} />
        <View style={[styles.separator, styles.sepV1]} />
        <View style={[styles.separator, styles.sepV2]} />
      </View>
    </View>
  );
};

/**
 * Main App
 */
export default function App() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>('X'); // Human starts (X)
  const [ai] = useState<Player>('O');
  const [human] = useState<Player>('X');
  const [winnerInfo, setWinnerInfo] = useState<{ winner: Player | 'Draw' | null; line: number[] | null }>({
    winner: null,
    line: null,
  });
  const [lockInput, setLockInput] = useState(false);

  const statusText = useMemo(() => {
    if (winnerInfo.winner === 'Draw') return "It's a draw!";
    if (winnerInfo.winner === human) return 'You win!';
    if (winnerInfo.winner === ai) return 'Computer wins!';
    return current === human ? 'Your turn' : "Computer's turn";
  }, [winnerInfo, current, human, ai]);

  const onHumanMove = useCallback(
    (index: number) => {
      if (lockInput || winnerInfo.winner) return;
      if (board[index] !== null) return;

      const nextBoard = [...board];
      nextBoard[index] = human;
      setBoard(nextBoard);

      const res = checkWinner(nextBoard);
      if (res.winner) {
        setWinnerInfo(res);
        return;
      }

      setCurrent(ai);
      setLockInput(true);

      // Simulate a tiny delay for the AI for a smoother feel
      setTimeout(() => {
        const aiMove = computeAIMove(nextBoard, ai, human);
        if (aiMove !== null) {
          const aiBoard = [...nextBoard];
          aiBoard[aiMove] = ai;
          setBoard(aiBoard);

          const aiRes = checkWinner(aiBoard);
          if (aiRes.winner) {
            setWinnerInfo(aiRes);
          } else {
            setCurrent(human);
          }
        } else {
          // No moves left -> draw safeguard
          setWinnerInfo({ winner: 'Draw', line: null });
        }
        setLockInput(false);
      }, 350);
    },
    [ai, board, human, lockInput, winnerInfo.winner]
  );

  const onRestart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrent(human);
    setWinnerInfo({ winner: null, line: null });
    setLockInput(false);
  }, [human]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Subtle gradient header background effect */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Tic-Tac-Toe</Text>
          <Text style={styles.subtitle}>Ocean Professional</Text>
        </View>

        <View style={styles.content}>
          <BoardView
            board={board}
            onMove={onHumanMove}
            disabled={current !== human || !!winnerInfo.winner || lockInput}
            winningLine={winnerInfo.line}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <Text
              style={[
                styles.statusText,
                winnerInfo.winner
                  ? winnerInfo.winner === human
                    ? { color: theme.colors.primary }
                    : winnerInfo.winner === 'Draw'
                    ? { color: theme.colors.subtleText }
                    : { color: theme.colors.error }
                  : current === human
                  ? { color: theme.colors.primary }
                  : { color: theme.colors.secondary },
              ]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>

          <Pressable onPress={onRestart} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  header: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.8,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.subtleText,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 360,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.8,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  boardGrid: {
    flex: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  square: {
    width: '33.3333%',
    height: '33.3333%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    position: 'absolute',
  },
  squareText: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Overlay separators
  separator: {
    position: 'absolute',
    backgroundColor: theme.colors.divider,
    borderRadius: theme.radius.pill,
    opacity: 0.9,
  },
  sepH1: { left: '4%', right: '4%', top: '33.33%', height: 2 },
  sepH2: { left: '4%', right: '4%', top: '66.66%', height: 2 },
  sepV1: { top: '4%', bottom: '4%', left: '33.33%', width: 2 },
  sepV2: { top: '4%', bottom: '4%', left: '66.66%', width: 2 },

  iosShadow: {
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  androidShadow: {
    elevation: 2,
  },

  footer: {
    marginTop: theme.spacing.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.8,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// Positioning squares programmatically via absolute positioning
// We place them after styles to keep the above concise.
const positions = [
  { top: '0%', left: '0%' },
  { top: '0%', left: '33.3333%' },
  { top: '0%', left: '66.6667%' },
  { top: '33.3333%', left: '0%' },
  { top: '33.3333%', left: '33.3333%' },
  { top: '33.3333%', left: '66.6667%' },
  { top: '66.6667%', left: '0%' },
  { top: '66.6667%', left: '33.3333%' },
  { top: '66.6667%', left: '66.6667%' },
];

/**
 * Override BoardView render to include absolute square positions for the grid.
 * This preserves the props typing and avoids using 'any'.
 */
(BoardView as unknown as React.FC<BoardProps>) = ({ board, onMove, disabled = false, winningLine = null }) => {
  const isHighlighted = (i: number) => winningLine?.includes(i) ?? false;
  return (
    <View style={styles.boardWrapper}>
      <View style={styles.boardGrid}>
        {board.map((cell, idx) => (
          <View key={idx} style={[StyleSheet.absoluteFill, positions[idx]]}>
            <Square value={cell} onPress={() => onMove(idx)} disabled={disabled} highlight={isHighlighted(idx)} />
          </View>
        ))}
        <View style={[styles.separator, styles.sepH1]} />
        <View style={[styles.separator, styles.sepH2]} />
        <View style={[styles.separator, styles.sepV1]} />
        <View style={[styles.separator, styles.sepV2]} />
      </View>
    </View>
  );
};
