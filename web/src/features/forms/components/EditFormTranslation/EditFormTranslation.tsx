import {
  QuestionType,
  type FunctionComponent
} from '@/common/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { isDateQuestion, isMultiSelectQuestion, isNumberQuestion, isRatingQuestion, isSingleSelectQuestion, isTextQuestion } from '@/common/guards';
import Layout from '@/components/layout/Layout';
import { NavigateBack } from '@/components/NavigateBack/NavigateBack';
import FormQuestionsTranslator from '@/components/questionsEditor/FormQuestionsTranslator';
import { LanguageBadge } from '@/components/ui/language-badge';
import { cn, isNilOrWhitespace, isNotNilOrWhitespace } from '@/lib/utils';
import { Route } from '@/routes/forms_.$formId.edit-translation.$languageCode';
import { useEffect } from 'react';
import { FormType } from '../../models/form';
import { formDetailsQueryOptions } from '../../queries';
import { EditDateQuestionType, EditMultiSelectQuestionType, EditNumberQuestionType, EditRatingQuestionType, EditSingleSelectQuestionType, EditTextQuestionType, ZEditQuestionType, ZTranslatedString } from '../../types';
import { FormDetailsBreadcrumbs } from '../FormDetailsBreadcrumbs/FormDetailsBreadcrumbs';
import EditFormTranslationDetails from './EditFormTranslationDetails';
import EditFormTranslationFooter from './EditFormTranslationFooter';

const ZEditFormTranslationType = z.object({
  formId: z.string().trim().min(1),
  defaultLanguage: z.string().trim().min(1),
  languageCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: ZTranslatedString,
  description: ZTranslatedString,
  languages: z.array(z.string()),
  formType: z.enum([FormType.Opening, FormType.Voting, FormType.ClosingAndCounting, FormType.Other]).catch(FormType.Opening),
  questions: z.array(ZEditQuestionType)
})
  .superRefine((data, ctx) => {
    if (isNilOrWhitespace(data.name[data.languageCode])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Form name is required',
        path: ['name'],
      });
    }

    if (isNotNilOrWhitespace(data.description?.[data.defaultLanguage]) && isNilOrWhitespace(data.description?.[data.languageCode])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Form description is required',
        path: ['description'],
      });
    }

    data.questions.forEach((question, index) => {
      if (isNilOrWhitespace(question.text[question.languageCode])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Question text is required',
          path: ['questions', index, 'text'],
        });
      }

      if (isNotNilOrWhitespace(question.helptext[question.defaultLanguage]) && isNilOrWhitespace(question.helptext[question.languageCode])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Question helptext is required',
          path: ['questions', index, 'helptext'],
        });
      }

      if (question.$questionType === QuestionType.NumberQuestionType || question.$questionType === QuestionType.TextQuestionType) {
        if (isNotNilOrWhitespace(question.inputPlaceholder[question.defaultLanguage]) && isNilOrWhitespace(question.inputPlaceholder[question.languageCode])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Input placeholder is required',
            path: ['questions', index, 'inputPlaceholder'],
          });
        }
      }

      if (question.$questionType === QuestionType.RatingQuestionType) {
        if (isNotNilOrWhitespace(question.lowerLabel[question.defaultLanguage]) && isNilOrWhitespace(question.lowerLabel[question.languageCode])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Question lower label is required',
            path: ['questions', index, 'lowerLabel'],
          });
        }

        if (isNotNilOrWhitespace(question.upperLabel[question.defaultLanguage]) && isNilOrWhitespace(question.upperLabel[question.languageCode])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Question upper label is required',
            path: ['questions', index, 'upperLabel'],
          });
        }
      }

      if (question.$questionType === QuestionType.SingleSelectQuestionType || question.$questionType === QuestionType.MultiSelectQuestionType) {
        question.options.forEach((option, optionIndex) => {
          if (isNilOrWhitespace(option.text[question.languageCode])) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Option text is required',
              path: ["questions", index, "options", optionIndex, 'text'],
            });
          }
        });

        // check uniqueness of options
        const optionTexts = question.options.map(o => o.text[question.languageCode]);
        const textCountMap = new Map<string | undefined, number>();
        const duplicatedIndexesMap = new Map<string | undefined, number>();

        // Step 1: Count occurrences of each option
        optionTexts.forEach((text, optionIndex) => {
          const numberOfOccurrences = (textCountMap.get(text) || 0) + 1;
          if (numberOfOccurrences > 1) {
            duplicatedIndexesMap.set(text, optionIndex)
          }
          textCountMap.set(text, numberOfOccurrences);
        });

        // Step 2: Mark duplicated options as invalid
        for (const [_, optionIndex] of duplicatedIndexesMap.entries()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Option text is not unique',
            path: ["questions", index, "options", optionIndex, 'text'],
          });
        }
      }

      if (question.hasDisplayLogic) {
        if (question.condition === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Question condition is required',
            path: ["questions", index, "condition"],
          });
        }

        if (question.parentQuestionId === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Question parent question is required',
            path: ["questions", index, "parentQuestionId"],
          });
        }

        if (question.value === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Question value is required',
            path: ["questions", index, "value"],
          });
        }
      }

      return z.NEVER
    });
  });

export type EditFormTranslationType = z.infer<typeof ZEditFormTranslationType>;

export default function EditFormTranslation(): FunctionComponent {
  const { formId, languageCode } = Route.useParams();
  const { data: formData } = useSuspenseQuery(formDetailsQueryOptions(formId));

  const form = useForm<EditFormTranslationType>({
    resolver: zodResolver(ZEditFormTranslationType),
    defaultValues: {
      formId: formData.id,
      code: formData.code,
      languageCode,
      defaultLanguage: formData.defaultLanguage,
      languages: formData.languages,
      name: formData.name,
      description: formData.description,
      formType: formData.formType,
      questions: formData
        .questions
        .map(question => {
          if (isNumberQuestion(question)) {
            const numberQuestion: EditNumberQuestionType = {
              $questionType: QuestionType.NumberQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},
              inputPlaceholder: question.inputPlaceholder ?? {},

              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return numberQuestion;
          }

          if (isTextQuestion(question)) {
            const textQuestion: EditTextQuestionType = {
              $questionType: QuestionType.TextQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},
              inputPlaceholder: question.inputPlaceholder ?? {},

              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return textQuestion;
          }

          if (isDateQuestion(question)) {
            const dateQuestion: EditDateQuestionType = {
              $questionType: QuestionType.DateQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},

              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return dateQuestion;
          }

          if (isRatingQuestion(question)) {
            const ratingQuestion: EditRatingQuestionType = {
              $questionType: QuestionType.RatingQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},
              scale: question.scale,
              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              lowerLabel: question.lowerLabel ?? {},
              upperLabel: question.upperLabel ?? {},
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return ratingQuestion;
          }

          if (isSingleSelectQuestion(question)) {
            const singleSelectQuestion: EditSingleSelectQuestionType = {
              $questionType: QuestionType.SingleSelectQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},
              options: question.options?.map(o => ({ optionId: o.id, isFlagged: o.isFlagged, isFreeText: o.isFreeText, text: o.text })) ?? [],

              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return singleSelectQuestion;
          }

          if (isMultiSelectQuestion(question)) {
            const multiSelectQuestion: EditMultiSelectQuestionType = {
              $questionType: QuestionType.MultiSelectQuestionType,
              questionId: question.id,
              text: question.text,
              helptext: question.helptext ?? {},
              options: question.options?.map(o => ({ optionId: o.id, isFlagged: o.isFlagged, isFreeText: o.isFreeText, text: o.text })) ?? [],

              hasDisplayLogic: !!question.displayLogic,

              parentQuestionId: question.displayLogic?.parentQuestionId,
              condition: question.displayLogic?.condition,
              value: question.displayLogic?.value,

              code: question.code,
              defaultLanguage: formData.defaultLanguage,
              languageCode: languageCode
            }

            return multiSelectQuestion;
          }

          return undefined;
        })
    },
    mode: 'all'
  });


  useEffect(() => {
    form.trigger();
  }, [formData]);

  const name = useWatch({ control: form.control, name: 'name', defaultValue: formData.name });

  return (
    <Layout
      backButton={<NavigateBack to='/election-event/$tab' params={{ tab: 'observer-forms' }} />}
      breadcrumbs={<FormDetailsBreadcrumbs formCode={formData.code} formName={name[languageCode] ?? ''} />}
      title={`${formData.code} - ${name[languageCode]}`}>
      <Form {...form}>
        <form className='flex flex-col flex-1'>
          <Tabs className='flex flex-col flex-1' defaultValue='form-details'>
            <TabsList className='grid grid-cols-2 bg-gray-200 w-[400px] mb-4'>
              <TabsTrigger value='form-details' className={cn({ 'border-b-4 border-red-400': form.getFieldState('name').invalid || form.getFieldState('code').invalid })}>Form details</TabsTrigger>
              <TabsTrigger value='questions' className={cn({ 'border-b-4 border-red-400': form.getFieldState('questions').invalid })}>Questions</TabsTrigger>
            </TabsList>
            <TabsContent value='form-details'>
              <Card className='pt-0'>
                <CardHeader className='flex flex-column gap-2'>
                  <div className='flex flex-row justify-between items-center'>
                    <CardTitle className='text-xl'>Form details</CardTitle>
                  </div>
                  <Separator />
                </CardHeader>
                <CardContent className='flex flex-col gap-6 items-baseline'>
                  <EditFormTranslationDetails languageCode={languageCode} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent className='flex flex-1 flex-col' value='questions'>
              <Card className='pt-0 h-[calc(100vh)] overflow-hidden'>
                <CardHeader className='flex flex-column gap-2'>
                  <div className='flex flex-row justify-between items-center'>
                    <CardTitle className='text-xl'>
                      {languageCode && (
                        <div className='flex gap-2 items-center'>
                          <span className='text-sm'>Form questions</span>
                          <LanguageBadge languageCode={languageCode} />
                        </div>
                      )}
                    </CardTitle>
                  </div>
                  <Separator />
                </CardHeader>
                <CardContent className='-mx-6 flex items-start justify-left px-6 sm:mx-0 sm:px-8 h-[100%]'>
                  <FormQuestionsTranslator />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <EditFormTranslationFooter />
        </form>
      </Form>
    </Layout>
  );
}
