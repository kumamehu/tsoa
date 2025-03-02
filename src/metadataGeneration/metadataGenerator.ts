import * as mm from 'minimatch';
import * as ts from 'typescript';
import { Block } from 'typescript';
import {fsGetFilesFromPath} from '../utils/fs';
import { ControllerGenerator } from './controllerGenerator';
import { Tsoa } from './tsoa';
export class MetadataGenerator {
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private circularDependencyResolvers = new Array<(referenceTypes: Tsoa.ReferenceTypeMap) => void>();

  public IsExportedNode(node: ts.Node) { return true; }

  constructor(entryFile: string, compilerOptions?: ts.CompilerOptions, private readonly ignorePaths?: string[]) {
    const files: any = fsGetFilesFromPath(entryFile);
    this.program = ts.createProgram(files, compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
  }

  public Generate(): Tsoa.Metadata {
    this.program.getSourceFiles().forEach((sf) => {
      if (this.ignorePaths && this.ignorePaths.length) {
        for (const path of this.ignorePaths) {
          if (mm(sf.fileName, path)) {
            return;
          }
        }
      }

      ts.forEachChild(sf, (node) => {
        if (node.kind === ts.SyntaxKind.FunctionDeclaration && this.IsExportedNode(node)) {
          ts.forEachChild( node, (childNode) => {
            if (childNode.kind === ts.SyntaxKind.Block) {
              ( childNode as Block ).statements.forEach( (statementNode) => {
                if(statementNode.kind === ts.SyntaxKind.ClassDeclaration) {
                  this.nodes.push(statementNode)
                }
              })
            }
          })
        } else {
          this.nodes.push(node);
        }
      });
    });

    const controllers = this.buildControllers();

    this.circularDependencyResolvers.forEach((c) => c(this.referenceTypeMap));

    return {
      controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  }

  public TypeChecker() {
    return this.typeChecker;
  }

  public AddReferenceType(referenceType: Tsoa.ReferenceType) {
    if (!referenceType.refName) {
      return;
    }
    this.referenceTypeMap[referenceType.refName] = referenceType;
  }

  public GetReferenceType(refName: string) {
    return this.referenceTypeMap[refName];
  }

  public OnFinish(callback: (referenceTypes: Tsoa.ReferenceTypeMap) => void) {
    this.circularDependencyResolvers.push(callback);
  }

  private buildControllers() {
    return this.nodes
      .filter((node) => node.kind === ts.SyntaxKind.ClassDeclaration && this.IsExportedNode(node as ts.ClassDeclaration))
      .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
      .filter((generator) => generator.IsValid())
      .map((generator) => generator.Generate());
  }
}
