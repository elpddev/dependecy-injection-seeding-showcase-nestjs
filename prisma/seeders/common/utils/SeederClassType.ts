export type SeederClassCtor = new (...args: any[]) => any;

export type SeederClassType = SeederClassCtor & {
  $inject: any[];
};
