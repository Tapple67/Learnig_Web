export type QuizItemClient = {
  id: string;
  order: number;
  type: "mcq" | "tf" | "short" | string;
  question: string;
  choices: any; // Json으로 내려오므로 일단 any
  points: number;
};

export type StartAttemptResponse = {
  attemptId: string;
  quizSet: {
    id: string;
    title: string | null;
    items: QuizItemClient[];
  };
};