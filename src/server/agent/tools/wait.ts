import ToolInputError from "../errors.ts";
import { t } from "../../../shared/index.ts";

type WaitArgs = {
  duration: number;
};

const MAX_DURATION_SECONDS = 2_147_483;

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const parameters = {
    additionalProperties: false,
    properties: {
      duration: {
        description: t("toolParamDuration"),
        minimum: 1,
        type: "integer",
      },
    },
    required: ["duration"],
    type: "object",
  },
  execute = async ({ duration }: WaitArgs): Promise<string> => {
    if (!Number.isSafeInteger(duration)) {
      throw new ToolInputError("duration 必须是安全整数");
    }
    if (duration > MAX_DURATION_SECONDS) {
      throw new ToolInputError(
        `duration 不能大于 ${String(MAX_DURATION_SECONDS)}`,
      );
    }
    await sleep(duration * 1000);
    return "等待结束";
  };

export default {
  description: t("toolWait"),
  execute,
  name: "wait",
  parameters,
};
