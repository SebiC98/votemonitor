import React, { useState } from "react";
import { View, styled } from "tamagui";
import Badge from "./Badge";
import Card from "./Card";
import { Typography } from "./Typography";
import CardFooter from "./CardFooter";

export interface Form {
  id?: string;
  name?: string;
  options?: string;
  numberOfQuestions?: string;
  numberOfCompletedQuestions?: string;
  status: string;
}

export interface FormCardProps {
  form: Form;
  onPress: () => void;
}

const FormCard = (props: FormCardProps): JSX.Element => {
  const { form, onPress } = props;

  const CardHeader = styled(View, {
    name: "CardHeader",
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: "$xxs",
  });

  return (
    <Card width="100%" onPress={onPress}>
      <CardHeader>
        <Typography preset="body1" color="$gray9" fontWeight="700">
          {form.name}
        </Typography>

        <Badge status={form.status} />
      </CardHeader>

      {form.options && (
        <Typography preset="body1" color="$gray6" marginBottom="$xxs">
          {form.options}
        </Typography>
      )}

      <CardFooter text={form.numberOfCompletedQuestions + "/" + form.numberOfQuestions} />
    </Card>
  );
};

export default FormCard;
