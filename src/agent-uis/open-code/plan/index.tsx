import "./index.css";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface PlanProps {
  toolCallId: string;
  executedPlans: string[];
  rejectedPlans: string[];
  remainingPlans: string[];
}

export default function Plan(props: PlanProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col w-full max-w-4xl border-[1px] rounded-xl border-slate-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-left">Code Plan</h2>
      </div>
      <motion.div
        className="relative overflow-hidden"
        animate={{
          height: isExpanded ? "auto" : "200px",
          opacity: isExpanded ? 1 : 0.7,
        }}
        transition={{
          height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.2 },
        }}
        initial={false}
      >
        <div className="grid grid-cols-3 divide-x divide-slate-300 w-full border-t border-slate-200 px-6 pt-4 pb-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium mb-4 text-slate-700">
              Remaining Plans
            </h3>
            {props.remainingPlans.map((step, index) => (
              <p key={index} className="font-mono text-sm">
                {index + 1}. {step}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2 px-6">
            <h3 className="text-lg font-medium mb-4 text-slate-700">
              Executed Plans
            </h3>
            {props.executedPlans.map((step, index) => (
              <p key={index} className="font-mono text-sm">
                {step}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2 px-6">
            <h3 className="text-lg font-medium mb-4 text-slate-700">
              Rejected Plans
            </h3>
            {props.rejectedPlans.map((step, index) => (
              <p key={index} className="font-mono text-sm">
                {step}
              </p>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.button
        className="w-full py-2 border-t border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="w-5 h-5 text-slate-600" />
        </motion.span>
      </motion.button>
    </div>
  );
}
