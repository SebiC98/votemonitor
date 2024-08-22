import { authApi } from '@/common/auth-api';
import { TranslatedString } from '@/common/types';
import { CreateDialogFooter } from '@/components/dialogs/CreateDialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import LanguageSelect from '@/containers/LanguageSelect';
import { queryClient } from '@/main';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FormBase, FormType, NewFormRequest, mapFormType } from '../../models/form';
import { formsKeys } from '../../queries';

function CreateForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const newFormFormSchema = z.object({
        code: z.string().nonempty('Form code is required'),
        name: z.string().nonempty('Form name is required'),
        description: z.string().optional(),
        defaultLanguage: z.string().nonempty(),
        formType: z.enum([FormType.Opening, FormType.Voting, FormType.ClosingAndCounting, FormType.Other]).catch(FormType.Opening)
    });

    const form = useForm<z.infer<typeof newFormFormSchema>>({
        resolver: zodResolver(newFormFormSchema),
        defaultValues: {
            formType: FormType.Opening
        }
    });

    function onSubmit(values: z.infer<typeof newFormFormSchema>) {
        const name: TranslatedString = {
            [values.defaultLanguage]: values.name!
        };

        const description: TranslatedString = {
            [values.defaultLanguage]: values.description ?? ''
        };

        const newForm: NewFormRequest = {
            ...values,
            description,
            name,
            languages: [values.defaultLanguage]
        };

        newFormMutation.mutate(newForm);
    }

    const newFormMutation = useMutation({
        mutationFn: (newForm: NewFormRequest) => {
            const electionRoundId: string | null = localStorage.getItem('electionRoundId');

            return authApi.post<FormBase>(`/election-rounds/${electionRoundId}/forms`, newForm);
        },

        onSuccess: ({ data: form }) => {
            toast({
                title: 'Success',
                description: 'Form created',
            });

            queryClient.invalidateQueries({ queryKey: formsKeys.all });
            navigate({ to: `/forms/$formId/edit`, params: { formId: form.id } });
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name='name'
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel>{t('form.field.name')}</FormLabel>
                            <Input placeholder={t('form.placeholder.name')} {...field}  {...fieldState} />
                            <FormMessage />
                        </FormItem>)} />

                <FormField
                    control={form.control}
                    name='code'
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel>{t('form.field.code')}</FormLabel>
                            <Input placeholder={t('form.placeholder.code')} {...field}  {...fieldState} />
                            <FormMessage />
                        </FormItem>
                    )} />

                <FormField
                    control={form.control}
                    name="formType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.field.formType')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a form type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={FormType.Opening}>{mapFormType(FormType.Opening)}</SelectItem>
                                    <SelectItem value={FormType.Voting}>{mapFormType(FormType.Voting)}</SelectItem>
                                    <SelectItem value={FormType.ClosingAndCounting}>{mapFormType(FormType.ClosingAndCounting)}</SelectItem>
                                    <SelectItem value={FormType.Other}>{mapFormType(FormType.Other)}</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />


                <FormField
                    control={form.control}
                    name='defaultLanguage'
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel>{t('form.field.defaultLanguage')}</FormLabel>
                            <LanguageSelect
                                languageCode={field.value}
                                onLanguageSelected={field.onChange}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('form.field.description')}</FormLabel>
                            <Textarea
                                resizable={false}
                                rows={10}
                                cols={100}
                                {...field}
                                placeholder={t('form.placeholder.description')} />
                        </FormItem>
                    )}
                />
                <CreateDialogFooter />
            </form>
        </Form>
    )
}

export default CreateForm