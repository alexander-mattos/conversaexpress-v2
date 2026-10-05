import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    HasMany,
    AutoIncrement,
    BelongsTo,
    ForeignKey,
    Default,
    DefaultScope
} from "sequelize-typescript";
import Queue from "./Queue";
import Company from "./Company";

// As credenciais (jsonContent do Dialogflow) não saem por padrão: a fila
// inclui a integração nos tickets, que chegam a todos os usuários. Só a tela
// de edição (admin) as lê, com unscoped().
@DefaultScope(() => ({ attributes: { exclude: ["jsonContent"] } }))
@Table
class QueueIntegrations extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column(DataType.TEXT)
    type: string;

    @Column(DataType.TEXT)
    name: string;
    
    @Column(DataType.TEXT)
    projectName: string;
    
    @Column(DataType.TEXT)
    jsonContent: string;

    @Column(DataType.TEXT)
    urlN8N: string;

    @Column(DataType.TEXT)
    language: string;

    @CreatedAt
    @Column(DataType.DATE(6))
    createdAt: Date;

    @UpdatedAt
    @Column(DataType.DATE(6))
    updatedAt: Date;

    @ForeignKey(() => Company)
    @Column
    companyId: number;
  
    @BelongsTo(() => Company)
    company: Company;
  
    @Column
    typebotSlug: string;

    @Default(0)
    @Column
    typebotExpires: number;

    @Column
    typebotKeywordFinish: string;

    @Column
    typebotUnknownMessage: string;

    @Default(1000)
    @Column
    typebotDelayMessage: number

    @Column
    typebotKeywordRestart: string;

    @Column
    typebotRestartMessage: string;
}

export default QueueIntegrations;