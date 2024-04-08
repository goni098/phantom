export type ContractEvent = Readonly<{
  type: string;
  attributes: ReadonlyArray<{
    key: string;
    value: string;
  }>;
}>;

export type MessageResponse = {
  jsonrpc: string;
  id: string;
  result: {
    data?: {
      value?: {
        TxResult?: {
          height: string;
          result: {
            events: Array<ContractEvent>;
          };
        };
      };
    };
    events?: Record<string, Array<string>>;
  };
};

export type WasmEvents = Array<ContractEvent>;
